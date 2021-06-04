// Color and theming utility functions! Handy.

// Graciously stolen from https://stackoverflow.com/a/54071699! ::::)
// in: r,g,b in [0,1], out: h in [0,360) and s,l in [0,1]
export function rgb2hsl(r, g, b) {
    let a=Math.max(r,g,b), n=a-Math.min(r,g,b), f=(1-Math.abs(a+a-n-1));
    let h= n && ((a==r) ? (g-b)/n : ((a==g) ? 2+(b-r)/n : 4+(r-g)/n));
    return [60*(h<0?h+6:h), f ? n/f : 0, (a+a-n)/2];
}

export function getColors(primary) {
    const [ r, g, b ] = primary.slice(1)
        .match(/[0-9a-fA-F]{2,2}/g)
        .slice(0, 3)
        .map(val => parseInt(val, 16) / 255);
    const [ h, s, l ] = rgb2hsl(r, g, b);
    const dim = `hsl(${Math.round(h)}deg, ${Math.round(s * 50)}%, ${Math.round(l * 80)}%)`;
    const bg = `hsla(${Math.round(h)}deg, ${Math.round(s * 15)}%, 12%, 0.80)`;

    return {primary, dim, bg};
}
