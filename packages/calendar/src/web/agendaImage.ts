/**
 * @nostr-post/calendar/web - An agenda as an image
 *
 * Draws an `agendaSummary` on a canvas, e.g. "this week's gigs" for a story or a chat: a title,
 * the dates, the events day by day, and a footer (where to see it all). Portrait 1080×1350 by
 * default; light or dark with the theme's colors.
 */

import { colors } from '@nostr-post/web';
import type { AgendaSummary } from '../agendaShare';

export interface AgendaImageOptions {
  title: string;
  /** Under the events, e.g. the site's address */
  footer?: string;
  dark?: boolean;
  width?: number;
  height?: number;
  /** Text for events left out; default "+N more" */
  moreText?: (count: number) => string;
  /** Text when there are no events; default "Nothing yet" */
  emptyText?: string;
}

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** Cuts text to fit `width`, with an ellipsis */
const fit = (ctx: CanvasRenderingContext2D, text: string, width: number): string => {
  if (ctx.measureText(text).width <= width) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > width) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
};

type Theme = (typeof colors)['light'] | (typeof colors)['dark'];

/** Where and how a drawing step draws: the context, theme, left edge, width and scale */
interface Pen {
  ctx: CanvasRenderingContext2D;
  theme: Theme;
  /** Day headings' color: the theme's primary, lighter on dark */
  accent: string;
  left: number;
  width: number;
  unit: number;
}

const text = (pen: Pen, value: string, x: number, y: number, style: string, color: string) => {
  pen.ctx.fillStyle = color;
  pen.ctx.font = `${style} ${FONT}`;
  pen.ctx.fillText(fit(pen.ctx, value, pen.width - (x - pen.left)), x, y);
};

type Row = { day: string } | { item: SummaryItem };
type SummaryItem = AgendaSummary['days'][number]['items'][number];

/** Height of a row */
const rowHeight = (row: Row, unit: number): number =>
  'day' in row ? 64 * unit : (row.item.place ? 92 : 84) * unit;

/** Draws a day heading or an event row at `y` */
const drawRow = (pen: Pen, row: Row, y: number) => {
  const { theme, left, unit } = pen;
  if ('day' in row) {
    text(pen, row.day, left, y + 34 * unit, `700 ${34 * unit}px`, pen.accent);
    return;
  }
  const { time, title, place } = row.item;
  const x = left + 120 * unit;
  if (time) text(pen, time, left, y + 32 * unit, `500 ${32 * unit}px`, theme.textSecondary);
  text(pen, title, x, y + 34 * unit, `600 ${38 * unit}px`, theme.text);
  if (place) text(pen, place, x, y + 70 * unit, `400 ${28 * unit}px`, theme.textSecondary);
};

/** Draws the rows that fit above `bottom`, from `y`; returns where it stopped and the events left out */
const drawRows = (pen: Pen, rows: Row[], y: number, bottom: number) => {
  let at = y;
  for (const [index, row] of rows.entries()) {
    if (at + rowHeight(row, pen.unit) > bottom) {
      return { y: at, hidden: rows.slice(index).filter((r) => 'item' in r).length };
    }
    drawRow(pen, row, at);
    at += rowHeight(row, pen.unit);
  }
  return { y: at, hidden: 0 };
};

/** Draws the summary on a new canvas */
export const drawAgendaImage = (
  summary: AgendaSummary,
  options: AgendaImageOptions
): HTMLCanvasElement => {
  const { title, footer, dark = false, width = 1080, height = 1350 } = options;
  const { moreText = (n: number) => `+${n} more`, emptyText = 'Nothing yet' } = options;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const theme = dark ? colors.dark : colors.light;
  const unit = width / 1080;
  const pad = Math.round(width * 0.07);
  const accent = dark ? '#a5b4fc' : theme.primary;
  const pen: Pen = { ctx, theme, accent, left: pad, width: width - 2 * pad, unit };

  ctx.fillStyle = dark ? '#111827' : theme.bg;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = theme.primary;
  ctx.fillRect(0, 0, width, 16 * unit);
  text(pen, title, pad, pad + 40 * unit, `700 ${64 * unit}px`, theme.text);
  text(pen, summary.range, pad, pad + 96 * unit, `500 ${36 * unit}px`, theme.textSecondary);

  const rows: Row[] = summary.days.flatMap((day) => [
    { day: day.label },
    ...day.items.map((item) => ({ item })),
  ]);
  const bottom = height - pad - (footer ? 60 : 0) * unit - 50 * unit;
  const drawn = drawRows(pen, rows, pad + 168 * unit, bottom);
  const hidden = summary.more + drawn.hidden;
  const note = summary.days.length ? (hidden ? moreText(hidden) : '') : emptyText;
  if (note) text(pen, note, pad, drawn.y + 32 * unit, `500 ${32 * unit}px`, theme.textSecondary);
  if (footer) text(pen, footer, pad, height - pad, `500 ${30 * unit}px`, theme.textSecondary);
  return canvas;
};

/** The summary as a PNG image */
export const agendaImage = (summary: AgendaSummary, options: AgendaImageOptions): Promise<Blob> =>
  new Promise((resolve, reject) => {
    drawAgendaImage(summary, options).toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The image could not be made'))),
      'image/png'
    );
  });
