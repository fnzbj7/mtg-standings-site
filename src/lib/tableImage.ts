import { toPng } from 'html-to-image';

function buildDownloadName(baseName: string) {
    return baseName.toLowerCase().endsWith('.png') ? baseName : `${baseName}.png`;
}

export async function downloadTableAsImage(tableElement: HTMLElement, baseName: string) {
    const dataUrl = await toPng(tableElement, {
        backgroundColor: '#ffffff',
        cacheBust: true,
        pixelRatio: 2,
        skipFonts: true,
    });

    const anchor = document.createElement('a');
    anchor.href = dataUrl;
    anchor.download = buildDownloadName(baseName);
    anchor.click();
}