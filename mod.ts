import { serve } from 'https://deno.land/std@0.125.0/http/mod.ts';

const decoder = new TextDecoder();
const html = decoder.decode(await Deno.readFile('./index.html'));
const css = decoder.decode(await Deno.readFile('./uno.css'));
const aboveOnePointRE = /[1-9]\d*\.\d+\.\d+/;
const belowOnePointRE = /(?<!\d)0\.\d+\.\d+/;

async function handler(res: Request): Promise<Response> {
  const { pathname } = new URL(res.url);
  if (pathname === '/') {
    return new Response(html, { headers: { 'content-type': 'text/html' } });
  } else if (pathname === '/uno.css') {
    return new Response(css, {
      headers: {
        'content-type': 'text/css',
        'cache-control': 'max-age=604800, stale-while-revalidate=86400',
      },
    });
  }

  let [scope, module] = pathname.replace(/^\/|\/$/gm, '').split('/');
  module = decodeURIComponent(module);

  if (scope === 'x') {
    const res = await fetch(
      `https://cdn.deno.land/${module}/meta/versions.json`,
      {
        referrer: 'https://shield.deno.dev',
      },
    );

    if (!res.ok) {
      return new Response(res.body, {
        headers: res.headers,
        status: res.status,
        statusText: res.statusText,
      });
    }

    const json = await res.json();
    scope = 'deno.land/x';
    module = json.latest || 'module not found';
  } else if (scope !== 'deno') {
    scope = 'shield.deno.dev';
    module = 'invalid URL';
  }

  const msgColor = getMsgColor(module, scope === 'deno');

  return new Response(generateBadge(scope, module, msgColor), {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'max-age=604800, stale-while-revalidate=86400',
    },
  });
}

serve(handler);

function generateBadge(label: string, msg: string, msgColor: string) {
  const ariaLabel = label + ' ' + msg;
  const padding = 8; // left right padding;
  const gap = 4; // gap between each item;
  const denoLogo = 16; // deno logo width and height;
  const scale = 6;
  const labelTextLength = label.length * scale;
  const msgTextLength = msg.length * scale;
  const leftW = labelTextLength + padding + denoLogo + gap;
  const rightW = msgTextLength + padding;
  const totalW = leftW + rightW;

  // deno-fmt-ignore
  return `
<svg viewBox="0 0 ${totalW} 20" width="${totalW}" height="20" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" role="img" aria-label="${ariaLabel}">
  <title>${ariaLabel}</title>
  <clipPath id="r">
    <rect width="${totalW}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${leftW}" height="20" fill="#000"/>
    <rect x="${leftW}" width="${rightW}" height="20" fill="${msgColor}"/>
  </g>
  <g fill="#fff" text-anchor="start" font-family="Verdana,sans-serif" font-size="11" text-rendering="geometricPrecision">
    <text x="${denoLogo + (2 * gap)}" y="13" textLength="${labelTextLength}">${escapeHTML(label)}</text>
    <text x="${leftW + gap}" y="13" textLength="${msgTextLength}">${escapeHTML(msg)}</text>
  </g>
  <image x="${gap}" y="2" width="${denoLogo}" height="${denoLogo}" xlink:href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiB2aWV3Qm94PSIwIDAgNTEyMCA1MTIwIj48dGl0bGU+RGVubyBsb2dvPC90aXRsZT48cGF0aCBkPSJNMjU2MCAwYTI1NjAgMjU2MCAwIDEgMSAwIDUxMjAgMjU2MCAyNTYwIDAgMCAxIDAtNTEyMHoiLz48cGF0aCBmaWxsPSIjZmZmIiBkPSJNMjQ2MCAxNDQ5Yy03NDQgMC0xMzI0IDQ2OS0xMzI0IDEwNTIgMCA1NTAgNTMzIDkwMSAxMzU5IDg4NGwyNS0xIDkxLTMtMjMgNjAgMyA2YTY2OCA2NjggMCAwIDEgMTggNDdsMiA2IDMgMTAgNCAxNCAzIDkgNCAxMCAzIDExIDQgMTYgNSAxNyAzIDExIDUgMTggNSAxOSA0IDE5IDUgMjAgNCAxNCA1IDIyIDUgMjIgNyAzMCAzIDE2IDUgMjQgNSAyNSA2IDI2IDcgMzcgNiAzMCA4IDQyIDQgMjEgNyAzMyA2IDM0IDggNDYgOSA0OCA4IDUwIDkgNTEgOSA1MiA5IDU0IDkgNTYgNyA0MyAxMSA3MyA1IDMwIDEyIDc3IDkgNjMgOCA0OCA5IDY2IDUgMzNjNTQ5LTczIDEwMzctMzM5IDEzOTMtNzI4bDExLTEyLTUxLTE5MC0xMzUtNTA1LTg0LTMxNC03NC0yNzYtNDYtMTY4LTI5LTEwNi0xNy02NC0xNi01Ni02LTI0LTQtMTMtMi03LTItNmMtNzgtMjUxLTIyOS00NzMtNDM1LTYzNC0yNDItMTg5LTU0OS0yODgtOTA3LTI4OHptLTY1NCAyNjY5Yy02NS0xOC0xMzMgMjAtMTUyIDg1bC0xIDMtMTEyIDQxNmEyMjg3IDIyODcgMCAwIDAgMjE1IDkzbDE3IDcgMTIxLTQ1MSAxLTNjMTYtNjYtMjMtMTMzLTg5LTE1MHptNjk3LTMwNWMtNjYtMTgtMTM0IDIwLTE1MyA4NWwtMSAzLTE3MCA2MzB2M2ExMjUgMTI1IDAgMCAwIDI0MSA2NWwxLTMgMTcwLTYzMHYtM2wzLTE0IDEtNS00LTIxLTYtMjktNC0xOGExMjUgMTI1IDAgMCAwLTc4LTYzem0tMTE4NS02NDktOCAxOS0xIDQtMTcwIDYzMC0xIDNhMTI1IDEyNSAwIDAgMCAyNDEgNjZsMS0zIDE1NC01NzJjLTgwLTQyLTE1My05Mi0yMTYtMTQ3em0tNDA1LTcyNWMtNjYtMTctMTM0IDIxLTE1MyA4NWwtMSAzLTE3MCA2MzB2M2ExMjUgMTI1IDAgMCAwIDI0MSA2NmwxLTMgMTcwLTYzMHYtM2MxNi02Ni0yMy0xMzMtODgtMTUxem0zODExLTE0M2MtNjUtMTctMTMzIDIxLTE1MiA4NWwtMSAzLTE3MCA2MzAtMSAzYTEyNSAxMjUgMCAwIDAgMjQyIDY2di0zbDE3MS02MzB2LTRjMTYtNjUtMjMtMTMyLTg5LTE1MHpNNTQyIDE0NTVhMjI4NCAyMjg0IDAgMCAwLTI2NyA4MzggMTI0IDEyNCAwIDAgMCA2MiAzOGM2NSAxNyAxMzMtMjEgMTUyLTg1bDEtMyAxNzAtNjMwIDEtM2MxNi02Ni0yMy0xMzMtODktMTUxYTEyNyAxMjcgMCAwIDAtMzAtNHptMzc1MiA0Yy02Ni0xNy0xMzMgMjEtMTUzIDg1djNsLTE3MCA2MzAtMSAzYTEyNSAxMjUgMCAwIDAgMjQxIDY2bDEtMyAxNzAtNjMwIDEtM2MxNi02Ni0yNC0xMzMtODktMTUxeiIvPjxwYXRoIGQ9Ik0yNjIwIDE4NzBhMTYwIDE2MCAwIDEgMSAwIDMyMCAxNjAgMTYwIDAgMCAxIDAtMzIweiIvPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Ik0xMjgyIDg2MGMtNjUtMTctMTMzIDIxLTE1MiA4NWwtMSAzLTE3MCA2MzAtMSAzYTEyNSAxMjUgMCAwIDAgMjQxIDY2bDEtMyAxNzAtNjMwIDEtNGMxNi02NS0yMy0xMzItODktMTUwem0yMTg1IDExOWMtNjYtMTctMTM0IDIxLTE1MyA4NWwtMSAzLTExNCA0MjRhMTM5OSAxMzk5IDAgMCAxIDIxMSAxMjhsMTEgOSAxMzQtNDk1di0zYzE2LTY2LTIzLTEzMy04OC0xNTF6TTIzNTUgMjY5YTIyOTkgMjI5OSAwIDAgMC0yMzggMzRsLTE3IDMtMTU4IDU4Ny0xIDNhMTI1IDEyNSAwIDAgMCAyNDEgNjVsMS0zIDE3MC02MzAgMS0zYTEyNCAxMjQgMCAwIDAgMS01NnptMTU2NCA0MzUtMzMgMTI0LTEgM2ExMjUgMTI1IDAgMCAwIDI0MSA2NWwxLTMgNC0xM2EyMzEyIDIzMTIgMCAwIDAtMTk3LTE2NWwtMTUtMTF6bS05ODktNDE0LTYwIDIyMy0xIDNhMTI1IDEyNSAwIDAgMCAyNDEgNjVsMS0zIDYzLTIzNWEyMjg2IDIyODYgMCAwIDAtMjI2LTUwbC0xOC0zeiIvPjwvc3ZnPg=="/>
</svg>`.trim();
}

function getMsgColor(status: string, isDeno: boolean) {
  // colors are from Tailwind 3.0
  // https://tailwindcss.com/docs/background-color
  if (isDeno) {
    return '#22c55e'; // bg-green-500
  } else if (aboveOnePointRE.test(status)) {
    return '#3b82f6'; // bg-blue-500
  } else if (belowOnePointRE.test(status)) {
    return '#f97316'; // bg-orange-500
  } else {
    return '#ef4444'; // bg-red-500
  }
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
