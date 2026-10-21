export const PLACEHOLDER = '/placeholder-product.svg';

export const imgSrc = (url) => url || PLACEHOLDER;

export const onImgError = (e) => { e.target.src = PLACEHOLDER; };
