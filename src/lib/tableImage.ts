import { toPng } from 'html-to-image';

function buildDownloadName(baseName: string) {
    return baseName.toLowerCase().endsWith('.png') ? baseName : `${baseName}.png`;
}

function formatTimestamp(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function buildRoundTimestampedName(baseName: string, currentRound: number) {
    const round = Math.max(0, Math.floor(currentRound));
    const roundToken = `R${String(round).padStart(2, '0')}`;
    const timestamp = formatTimestamp(new Date());
    return `${roundToken}-${baseName}-${timestamp}`;
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