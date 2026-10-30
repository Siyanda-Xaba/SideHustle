const photoCache = new Map();

function pageTitle(page) {
    return String(page?.title ?? '');
}

function chooseVehiclePage(pages, make, model) {
    const exactTitle = `${make} ${model}`.toLowerCase();
    const makeKey = make.toLowerCase();
    const withThumbnails = pages.filter((page) => page?.thumbnail?.source);
    const exact = withThumbnails.find((page) => pageTitle(page).toLowerCase() === exactTitle);
    if (exact) {
        return exact;
    }
    const named = withThumbnails
        .filter((page) => pageTitle(page).toLowerCase().includes(makeKey))
        .sort((left, right) => (left.index ?? 99) - (right.index ?? 99));
    return named[0] ?? null;
}

export async function getVehiclePhotoUrl(vehicle) {
    const make = String(vehicle?.make ?? '').trim();
    const model = String(vehicle?.model ?? '').trim();
    if (!make || !model) {
        return null;
    }
    const cacheKey = `${make}|${model}`.toLowerCase();
    if (photoCache.has(cacheKey)) {
        return photoCache.get(cacheKey);
    }
    const endpoint = new URL('https://en.wikipedia.org/w/api.php');
    endpoint.searchParams.set('action', 'query');
    endpoint.searchParams.set('format', 'json');
    endpoint.searchParams.set('generator', 'search');
    endpoint.searchParams.set('gsrlimit', '5');
    endpoint.searchParams.set('gsrsearch', `${make} ${model}`);
    endpoint.searchParams.set('origin', '*');
    endpoint.searchParams.set('piprop', 'thumbnail');
    endpoint.searchParams.set('pithumbsize', '1280');
    endpoint.searchParams.set('prop', 'pageimages');
    const response = await fetch(endpoint.toString());
    if (!response.ok) {
        return null;
    }
    const payload = await response.json();
    const pages = Object.values(payload?.query?.pages ?? {});
    const photoUrl = chooseVehiclePage(pages, make, model)?.thumbnail?.source ?? null;
    if (photoUrl) {
        photoCache.set(cacheKey, photoUrl);
    }
    return photoUrl;
}
