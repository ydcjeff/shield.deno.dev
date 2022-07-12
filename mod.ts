import { serve } from 'https://deno.land/std@0.147.0/http/mod.ts';
import { serveDir } from 'https://deno.land/std@0.147.0/http/file_server.ts';

const above_one_point_re = /[1-9]\d*\.\d+\.\d+/;
const below_one_point_re = /(?<!\d)0\.\d+\.\d+/;

async function handler(request: Request): Promise<Response> {
	const { pathname } = new URL(request.url);

	if (['/', '/uno.css'].includes(pathname)) {
		if (pathname === '/') request = new Request(request.url + 'index.html');
		return serveDir(request, {
			quiet: !!Deno.env.get('DENO_DEPLOYMENT_ID'),
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

	const msg_color = get_msg_color(module, scope === 'deno');

	return new Response(generate_badge(scope, module, msg_color), {
		headers: {
			'Content-Type': 'image/svg+xml; charset=utf-8',
			'Cache-Control': 'max-age=300, s-maxage=300, must-revalidate',
		},
	});
}

serve(handler);

function generate_badge(label: string, msg: string, msg_color: string) {
	const aria_label = label + ' ' + msg;
	const padding = 8; // left right padding;
	const gap = 4; // gap between each item;
	const deno_logo = 16; // deno logo width and height;
	const scale = 6;
	const label_text_length = label.length * scale;
	const msg_text_length = msg.length * scale;
	const left_width = label_text_length + padding + deno_logo + gap;
	const right_width = msg_text_length + padding;
	const total_width = left_width + right_width;

	// deno-fmt-ignore
	return `
<svg viewBox="0 0 ${total_width} 20" width="${total_width}" height="20" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" role="img" aria-label="${aria_label}">
  <title>${aria_label}</title>
  <clipPath id="r">
    <rect width="${total_width}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${left_width}" height="20" fill="#000"/>
    <rect x="${left_width}" width="${right_width}" height="20" fill="${msg_color}"/>
  </g>
  <g fill="#fff" text-anchor="start" font-family="Verdana,sans-serif" font-size="11" text-rendering="geometricPrecision">
    <text x="${deno_logo + (2 * gap)}" y="13" textLength="${label_text_length}">${escape_html(label)}</text>
    <text x="${left_width + gap}" y="13" textLength="${msg_text_length}">${escape_html(msg)}</text>
  </g>
  <image x="${gap}" y="2" width="${deno_logo}" height="${deno_logo}" xlink:href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiB2aWV3Qm94PSIwIDAgNTEyMCA1MTIwIj48dGl0bGU+RGVubyBsb2dvPC90aXRsZT48cGF0aCBkPSJNMjU2MCAwYTI1NjAgMjU2MCAwIDEgMSAwIDUxMjAgMjU2MCAyNTYwIDAgMCAxIDAtNTEyMHoiLz48cGF0aCBmaWxsPSIjZmZmIiBkPSJNMjQ2MCAxNDQ5Yy03NDQgMC0xMzI0IDQ2OS0xMzI0IDEwNTIgMCA1NTAgNTMzIDkwMSAxMzU5IDg4NGwyNS0xIDkxLTMtMjMgNjAgMyA2YTY2OCA2NjggMCAwIDEgMTggNDdsMiA2IDMgMTAgNCAxNCAzIDkgNCAxMCAzIDExIDQgMTYgNSAxNyAzIDExIDUgMTggNSAxOSA0IDE5IDUgMjAgNCAxNCA1IDIyIDUgMjIgNyAzMCAzIDE2IDUgMjQgNSAyNSA2IDI2IDcgMzcgNiAzMCA4IDQyIDQgMjEgNyAzMyA2IDM0IDggNDYgOSA0OCA4IDUwIDkgNTEgOSA1MiA5IDU0IDkgNTYgNyA0MyAxMSA3MyA1IDMwIDEyIDc3IDkgNjMgOCA0OCA5IDY2IDUgMzNjNTQ5LTczIDEwMzctMzM5IDEzOTMtNzI4bDExLTEyLTUxLTE5MC0xMzUtNTA1LTg0LTMxNC03NC0yNzYtNDYtMTY4LTI5LTEwNi0xNy02NC0xNi01Ni02LTI0LTQtMTMtMi03LTItNmMtNzgtMjUxLTIyOS00NzMtNDM1LTYzNC0yNDItMTg5LTU0OS0yODgtOTA3LTI4OHptLTY1NCAyNjY5Yy02NS0xOC0xMzMgMjAtMTUyIDg1bC0xIDMtMTEyIDQxNmEyMjg3IDIyODcgMCAwIDAgMjE1IDkzbDE3IDcgMTIxLTQ1MSAxLTNjMTYtNjYtMjMtMTMzLTg5LTE1MHptNjk3LTMwNWMtNjYtMTgtMTM0IDIwLTE1MyA4NWwtMSAzLTE3MCA2MzB2M2ExMjUgMTI1IDAgMCAwIDI0MSA2NWwxLTMgMTcwLTYzMHYtM2wzLTE0IDEtNS00LTIxLTYtMjktNC0xOGExMjUgMTI1IDAgMCAwLTc4LTYzem0tMTE4NS02NDktOCAxOS0xIDQtMTcwIDYzMC0xIDNhMTI1IDEyNSAwIDAgMCAyNDEgNjZsMS0zIDE1NC01NzJjLTgwLTQyLTE1My05Mi0yMTYtMTQ3em0tNDA1LTcyNWMtNjYtMTctMTM0IDIxLTE1MyA4NWwtMSAzLTE3MCA2MzB2M2ExMjUgMTI1IDAgMCAwIDI0MSA2NmwxLTMgMTcwLTYzMHYtM2MxNi02Ni0yMy0xMzMtODgtMTUxem0zODExLTE0M2MtNjUtMTctMTMzIDIxLTE1MiA4NWwtMSAzLTE3MCA2MzAtMSAzYTEyNSAxMjUgMCAwIDAgMjQyIDY2di0zbDE3MS02MzB2LTRjMTYtNjUtMjMtMTMyLTg5LTE1MHpNNTQyIDE0NTVhMjI4NCAyMjg0IDAgMCAwLTI2NyA4MzggMTI0IDEyNCAwIDAgMCA2MiAzOGM2NSAxNyAxMzMtMjEgMTUyLTg1bDEtMyAxNzAtNjMwIDEtM2MxNi02Ni0yMy0xMzMtODktMTUxYTEyNyAxMjcgMCAwIDAtMzAtNHptMzc1MiA0Yy02Ni0xNy0xMzMgMjEtMTUzIDg1djNsLTE3MCA2MzAtMSAzYTEyNSAxMjUgMCAwIDAgMjQxIDY2bDEtMyAxNzAtNjMwIDEtM2MxNi02Ni0yNC0xMzMtODktMTUxeiIvPjxwYXRoIGQ9Ik0yNjIwIDE4NzBhMTYwIDE2MCAwIDEgMSAwIDMyMCAxNjAgMTYwIDAgMCAxIDAtMzIweiIvPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Ik0xMjgyIDg2MGMtNjUtMTctMTMzIDIxLTE1MiA4NWwtMSAzLTE3MCA2MzAtMSAzYTEyNSAxMjUgMCAwIDAgMjQxIDY2bDEtMyAxNzAtNjMwIDEtNGMxNi02NS0yMy0xMzItODktMTUwem0yMTg1IDExOWMtNjYtMTctMTM0IDIxLTE1MyA4NWwtMSAzLTExNCA0MjRhMTM5OSAxMzk5IDAgMCAxIDIxMSAxMjhsMTEgOSAxMzQtNDk1di0zYzE2LTY2LTIzLTEzMy04OC0xNTF6TTIzNTUgMjY5YTIyOTkgMjI5OSAwIDAgMC0yMzggMzRsLTE3IDMtMTU4IDU4Ny0xIDNhMTI1IDEyNSAwIDAgMCAyNDEgNjVsMS0zIDE3MC02MzAgMS0zYTEyNCAxMjQgMCAwIDAgMS01NnptMTU2NCA0MzUtMzMgMTI0LTEgM2ExMjUgMTI1IDAgMCAwIDI0MSA2NWwxLTMgNC0xM2EyMzEyIDIzMTIgMCAwIDAtMTk3LTE2NWwtMTUtMTF6bS05ODktNDE0LTYwIDIyMy0xIDNhMTI1IDEyNSAwIDAgMCAyNDEgNjVsMS0zIDYzLTIzNWEyMjg2IDIyODYgMCAwIDAtMjI2LTUwbC0xOC0zeiIvPjwvc3ZnPg=="/>
</svg>`.trim();
}

function get_msg_color(status: string, is_deno: boolean) {
	// colors are from Tailwind 3.0
	// https://tailwindcss.com/docs/background-color
	if (is_deno) {
		return '#22c55e'; // bg-green-500
	} else if (above_one_point_re.test(status)) {
		return '#3b82f6'; // bg-blue-500
	} else if (below_one_point_re.test(status)) {
		return '#f97316'; // bg-orange-500
	} else {
		return '#ef4444'; // bg-red-500
	}
}

function escape_html(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}
