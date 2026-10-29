const policy = require('../../diagnostic-policy.json');

const ranges = new Set(policy.operations.readSupportedPidRange.allowedPids);
const livePids = new Set(Object.keys(policy.operations.readLivePid.allowedPids));

function buildApprovedDiagnosticRequest(operation, parameters = {}, sessionState) {
  if (sessionState !== 'connected') {
    throw new Error('A connected OBD session is required before a diagnostic request.');
  }
  if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) {
    throw new Error('Diagnostic parameters must be an object.');
  }
  if (operation === 'readSupportedPidRange') {
    if (Object.keys(parameters).some((key) => key !== 'pid')) throw new Error('Unsupported diagnostic parameters were supplied.');
    if (!ranges.has(parameters.pid)) throw new Error('This supported-PID range is not allowed.');
    return { command: '01' + parameters.pid, responseService: '41', pid: parameters.pid, dataBytes: 4 };
  }
  if (operation === 'readLivePid') {
    if (Object.keys(parameters).some((key) => key !== 'pid')) throw new Error('Unsupported diagnostic parameters were supplied.');
    const pid = typeof parameters.pid === 'string' ? parameters.pid.toUpperCase() : '';
    if (!livePids.has(pid)) throw new Error('This live-data PID is not approved.');
    return {
      command: '01' + pid,
      responseService: '41',
      pid,
      dataBytes: policy.operations.readLivePid.allowedPids[pid].dataBytes,
    };
  }
  if (operation === 'readStoredEmissionDtcs' && Object.keys(parameters).length === 0) {
    return { command: '03', responseService: '43', pid: null, maxResponseBytes: policy.operations.readStoredEmissionDtcs.maxResponseBytes };
  }
  throw new Error('This diagnostic operation is not approved.');
}

function requireScanAuthorization(authorized) {
  if (authorized !== true) throw new Error('Confirm that you are authorized to scan this vehicle before connecting.');
}

function validateApprovedResponse(response, request) {
  if (typeof response !== 'string' || response.length > policy.limits.responseCharacters) {
    throw new Error('The adapter response is invalid or too large.');
  }
  const noDataResponse = response.replace(/SEARCHING\.\.\./gi, '').replace(/[>\r\n]/g, ' ').trim().toUpperCase();
  if (noDataResponse === 'NO DATA' || noDataResponse === request.command + ' NO DATA') return null;
  let cleaned = response
    .replace(/SEARCHING\.\.\./gi, '')
    .replace(/\bNO DATA\b/gi, '');

  // Strip echoed command only from the start of the response string
  const cmdRegex = new RegExp(`^\\s*${request.command}\\b|^\\s*${request.command.split('').join('\\s*')}\\b`, 'i');
  cleaned = cleaned.replace(cmdRegex, ' ');

  // Allow successful bus init status messages from ELM327 without false-positive error
  cleaned = cleaned.replace(/BUS\s*INIT:\s*(?:OK|\.\.\.)/gi, ' ');
  cleaned = cleaned.replace(/\bOK\b/gi, '');
  cleaned = cleaned.replace(/[\r\n\t>]/g, ' ').trim();

  if (/STOPPED|UNABLE TO CONNECT|CAN ERROR|BUS INIT:?\s*ERROR|\?/i.test(cleaned)) {
    if (/UNABLE TO CONNECT|BUS INIT/i.test(cleaned)) {
      throw new Error(
        "The OBD adapter connected successfully, but could not reach the car's computer. Please ensure your car's ignition is turned ON (dashboard lights on or engine running) so the vehicle ECU is active, then try scanning again."
      );
    }
    if (/CAN ERROR/i.test(cleaned)) {
      throw new Error(
        "Vehicle CAN bus communication error. Make sure your car's ignition is turned ON and the adapter is firmly connected."
      );
    }
    if (/STOPPED/i.test(cleaned)) {
      throw new Error(
        "Vehicle communication was interrupted. Check that the adapter is securely plugged into the OBD-II port."
      );
    }
    throw new Error("The adapter or vehicle did not complete the read request. Make sure your car's ignition is turned ON.");
  }

  // Strip any remaining harmless bus init text before hex validation
  cleaned = cleaned.replace(/BUS\s*INIT[^\r\n]*/gi, '').trim();

  if (!/^[0-9A-F]{2}(?:\s+[0-9A-F]{2})*$/i.test(cleaned)) {
    throw new Error('The adapter response contains malformed diagnostic data.');
  }
  const bytes = cleaned.match(/[0-9A-F]{2}/gi)?.map((byte) => byte.toUpperCase()) || [];
  const index = bytes.findIndex((byte, position) =>
    byte === request.responseService && (request.pid == null || bytes[position + 1] === request.pid));
  if (index < 0) throw new Error('The adapter returned a response outside the approved diagnostic service.');
  const prefixLength = request.pid == null ? 1 : 2;
  const requiredLength = prefixLength + (request.dataBytes ?? 0);
  if (request.maxResponseBytes && bytes.length - index > request.maxResponseBytes) {
    throw new Error('The adapter returned an oversized diagnostic response.');
  }
  if (request.dataBytes != null && bytes.length - index !== requiredLength) {
    throw new Error('The adapter returned an incomplete diagnostic response.');
  }
  if (request.maxResponseBytes && bytes.length - index < 2) {
    throw new Error('The adapter returned an incomplete diagnostic response.');
  }
  return bytes.slice(index, request.dataBytes == null ? undefined : index + requiredLength).join(' ');
}

function getDiagnosticOperationList() {
  return Object.entries(policy.operations).map(([name, definition]) => ({ name, ...definition }));
}

module.exports = { buildApprovedDiagnosticRequest, validateApprovedResponse, getDiagnosticOperationList, requireScanAuthorization, obdDiagnosticPolicy: policy };
