// strava-explorer/src/log.js

export function debug(...args) {
    if (import.meta.env.DEV) {
        console.log(...args);
    }
}

export function warn(...args) {
    console.warn(...args);
}

export function error(...args) {
    console.error(...args);
}
