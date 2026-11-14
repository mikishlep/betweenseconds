/** Called only from a user click; fullscreen is browser-owned and can be refused. */
export async function toggleFullscreen(): Promise<boolean> {
    if (typeof document === "undefined") return false;
    try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
        return true;
    } catch { return false; }
}
