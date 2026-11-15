// \0rolldown/runtime.js
var e = Object.create, t = Object.defineProperty, n = Object.getOwnPropertyDescriptor, r = Object.getOwnPropertyNames, i = Object.getPrototypeOf, a = Object.prototype.hasOwnProperty, o = (e, t) => () => (t || (e((t = { exports: {} }).exports, t, t.exports), e = null), t.exports), s = (e, i, o, s) => {
	if (i && typeof i == "object" || typeof i == "function") for (var c = r(i), l = 0, u = c.length, d; l < u; l++) d = c[l], !a.call(e, d) && d !== o && t(e, d, {
		get: ((e) => i[e]).bind(null, d),
		enumerable: !(s = n(i, d)) || s.enumerable
	});
	return e;
}, c = (n, r, o) => (o = n == null ? {} : e(i(n)), s(r || !n || !n.__esModule || !a.call(n, "default") ? t(o, "default", {
	value: n,
	enumerable: !0
}) : o, n)), l = 6371, u = 6378.137, d = 398600.4418, f = Math.PI / 180, p = 180 / Math.PI, m = 864e5;
function h(e) {
	return e / m + 2440587.5;
}
function g(e) {
	let t = (h(e) - 2451545) / 36525, n = -62e-7 * t * t * t + .093104 * t * t + 3164400184.812866 * t + 67310.54841;
	return n = n * f / 240 % (2 * Math.PI), n < 0 ? n + 2 * Math.PI : n;
}
function _(e, t, n, r) {
	let i = g(r), a = Math.cos(i), o = Math.sin(i);
	return [
		a * e + o * t,
		-o * e + a * t,
		n
	];
}
function v(e) {
	let t = h(e) - 2451545, n = (280.46 + .9856474 * t) % 360, r = (357.528 + .9856003 * t) % 360 * f, i = (n + 1.915 * Math.sin(r) + .02 * Math.sin(2 * r)) * f, a = (23.439 - 4e-7 * t) * f;
	return [
		Math.cos(i),
		Math.cos(a) * Math.sin(i),
		Math.sin(a) * Math.sin(i)
	];
}
function y(e) {
	let [t, n, r] = v(e), [i, a, o] = _(t, n, r, e), s = Math.hypot(i, a, o) || 1;
	return [
		i / s,
		a / s,
		o / s
	];
}
function b(e, t, n) {
	let [r, i, a] = y(n), o = Math.cos(e * f), s = o * Math.cos(t * f) * r + o * Math.sin(t * f) * i + Math.sin(e * f) * a;
	return Math.asin(T(s, -1, 1)) * p;
}
function x(e, t) {
	let n = (t.lat - e.lat) * f, r = (t.lon - e.lon) * f, i = Math.sin(n / 2) ** 2 + Math.cos(e.lat * f) * Math.cos(t.lat * f) * Math.sin(r / 2) ** 2;
	return 2 * l * Math.asin(Math.min(1, Math.sqrt(i)));
}
function S(e, t) {
	let n = e.lat * f, r = t.lat * f, i = (t.lon - e.lon) * f, a = Math.sin(i) * Math.cos(r), o = Math.cos(n) * Math.sin(r) - Math.sin(n) * Math.cos(r) * Math.cos(i);
	return (Math.atan2(a, o) * p + 360) % 360;
}
function C(e, t, n) {
	let r = n / l * p, i = r / Math.max(.01, Math.cos(e * f));
	return [
		t - i,
		e - r,
		t + i,
		e + r
	];
}
function w(e, t) {
	return new Date(e + t / 15 * 36e5).toISOString().slice(0, 10);
}
var T = (e, t, n) => Math.min(n, Math.max(t, e)), E = "https://planetarycomputer.microsoft.com/api/stac/v1/search", D = "https://earth-search.aws.element84.com/v1/search", O = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi", k = "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/1.0.0", ee = "https://worldview.earthdata.nasa.gov/", te = "https://view.eumetsat.int/geoserver", A = `${te}/ows`;
function j({ halfSizeKm: e, px: t }) {
	return {
		halfSizeKm: Math.min(Number.isFinite(e) && e > 0 ? e : 3, 2e3),
		px: Math.min(2048, Math.max(8, Number.isFinite(t) ? Math.round(t) : 512))
	};
}
function M(e, t, n, r, i = "image/jpeg") {
	let { halfSizeKm: a, px: o } = j(r), [s, c, l, u] = C(n.lat, n.lon, a), d = (e) => Math.max(-90, Math.min(90, e)).toFixed(5), f = (e) => e.toFixed(5);
	return `${O}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=${encodeURIComponent(e)}&STYLES=&FORMAT=${encodeURIComponent(i)}&CRS=EPSG:4326&BBOX=${d(c)},${f(s)},${d(u)},${f(l)}&WIDTH=${o}&HEIGHT=${o}&TIME=${encodeURIComponent(t)}`;
}
function N(e, t, n, r) {
	return `${k}/${encodeURIComponent(e)}/default/${encodeURIComponent(t)}/all/${n}--${r}.xml`;
}
function ne(e, t, n, r = 400) {
	let [i, a, o, s] = C(n.lat, n.lon, r), c = (e) => e.toFixed(4);
	return `${ee}?v=${c(i)},${c(a)},${c(o)},${c(s)}&l=${encodeURIComponent(e)},Coastlines_15m&t=${encodeURIComponent(t)}`;
}
// api/_lib/utm.ts
var re = 6378137, P = 1 / 298.257223563, F = .9996, I = 5e5, L = 1e7, R = Math.PI / 180, ie = P / 1.9966471893352524, z = ie * ie * ie, B = z * ie, V = Math.sqrt(P * 1.9966471893352524), H = 1 - V * V, ae = F * re * 1.000000704945401 / 1.0016792203863838, oe = [
	.0008377318206303529,
	7.608527714248998e-7,
	61 * z / 240 - 103 * B / 140,
	49561 * B / 161280
], U = [
	.000837732164082144 - B / 360,
	5.906110863719917e-8 - 437 * B / 1440,
	17 * z / 480 - 37 * B / 840,
	4397 * B / 161280
];
function W(e) {
	return Number.isInteger(e) ? e >= 32601 && e <= 32660 ? {
		zone: e - 32600,
		south: !1
	} : e >= 32701 && e <= 32760 ? {
		zone: e - 32700,
		south: !0
	} : null : null;
}
var G = (e) => e * 6 - 183, K = (e) => ((e + 180) % 360 + 360) % 360 - 180;
function q(e, t) {
	if (!(e >= -80 && e < 84) || !Number.isFinite(t)) return null;
	let n = K(t);
	return e >= 56 && e < 64 && n >= 3 && n < 12 ? 32 : e >= 72 && n >= 0 && n < 42 ? n < 9 ? 31 : n < 21 ? 33 : n < 33 ? 35 : 37 : Math.min(60, Math.floor((n + 180) / 6) + 1);
}
function J(e) {
	let t = Math.hypot(1, e), n = Math.sinh(V * Math.atanh(V * e / t));
	return Math.hypot(1, n) * e - n * t;
}
function se(e) {
	let t = e / H;
	for (let n = 0; n < 8; n++) {
		let n = J(t), r = (e - n) * (1 + H * t * t) / (H * Math.hypot(1, t) * Math.hypot(1, n));
		if (t += r, Math.abs(r) < 1e-14 * Math.max(1, Math.abs(t))) break;
	}
	return t;
}
function Y(e) {
	let t = W(e);
	if (!t) throw Error(`not a UTM EPSG code: ${e}`);
	return t;
}
function ce(e, t, n) {
	let { zone: r, south: i } = Y(e), a = t * R, o = K(n - G(r)) * R, s = J(Math.tan(a)), c = Math.atan2(s, Math.cos(o)), l = Math.asinh(Math.sin(o) / Math.hypot(s, Math.cos(o))), u = c, d = l;
	for (let e = 1; e <= 4; e++) {
		let t = oe[e - 1];
		u += t * Math.sin(2 * e * c) * Math.cosh(2 * e * l), d += t * Math.cos(2 * e * c) * Math.sinh(2 * e * l);
	}
	return [I + ae * d, (i ? L : 0) + ae * u];
}
function le(e, t, n) {
	let { zone: r, south: i } = Y(e), a = (n - (i ? L : 0)) / ae, o = (t - I) / ae, s = a, c = o;
	for (let e = 1; e <= 4; e++) {
		let t = U[e - 1];
		s -= t * Math.sin(2 * e * a) * Math.cosh(2 * e * o), c -= t * Math.cos(2 * e * a) * Math.sinh(2 * e * o);
	}
	let l = Math.sinh(c), u = Math.cos(s), d = Math.sin(s) / Math.hypot(l, u);
	return [Math.atan(se(d)) / R, K(G(r) + Math.atan2(l, u) / R)];
}
// api/_lib/toneRender.ts
var X = "https://planetarycomputer.microsoft.com/api/data/v1", Z = 6371, ue = Math.PI / 180, de = {
	"sentinel-2-l2a": 10,
	"landsat-c2-l2": 30
}, fe = {
	"sentinel-2-l2a": 5,
	"landsat-c2-l2": 7.5
}, pe = {
	"sentinel-2-l2a": 3.15,
	"landsat-c2-l2": 4.725
}, me = {
	"sentinel-2-l2a": 630,
	"landsat-c2-l2": 315
}, he = (e) => e === "sentinel-2-l2a" || e === "landsat-c2-l2";
function Q(e, t, n) {
	let r = n / Z * (180 / Math.PI), i = r / Math.max(.01, Math.cos(e * ue));
	return [
		t - i,
		e - r,
		t + i,
		e + r
	];
}
var $ = (e) => Math.round(e * 100) / 100, ge = (e) => e.toFixed(6), _e = (e) => `${ge(e[0])},${ge(e[1])},${ge(e[2])},${ge(e[3])}`, ve = (e) => String(Math.round(e * 100) / 100), ye = (e) => `${ve(e[0])},${ve(e[1])},${ve(e[2])},${ve(e[3])}`, be = (e, t) => (e % t + t) % t;
function xe(e) {
	let t = /_T(\d{2})([C-HJ-NP-X])[A-Z]{2}_/.exec(e);
	if (!t) return null;
	let n = Number(t[1]);
	return n >= 1 && n <= 60 ? (t[2] >= "N" ? 32600 : 32700) + n : null;
}
function Se(e, t, n) {
	let r = n?.[e === "sentinel-2-l2a" ? "B04" : "red"], i = r?.["proj:code"] ?? t["proj:code"], a = typeof i == "string" && /^EPSG:\d+$/.test(i) ? Number(i.slice(5)) : r?.["proj:epsg"] ?? t["proj:epsg"];
	return typeof a == "number" && W(a) ? a : null;
}
var Ce = (e, t) => q($(e), $(t));
function we(e, t, n) {
	let r = Ce(t, n);
	return r === null ? null : e === "sentinel-2-l2a" ? {
		epsg: ($(t) >= 0 ? 32600 : 32700) + r,
		gsd: 10,
		ox: 0,
		oy: 0
	} : {
		epsg: 32600 + r,
		gsd: 30,
		ox: 15,
		oy: 15
	};
}
function Te(e, t, n) {
	let r = e === void 0 ? null : W(e);
	return !!r && r.zone === Ce(t, n);
}
var Ee = (e, t, n) => Math.round(e[0] * 100) === Math.round(t * 100) && Math.round(e[1] * 100) === Math.round(n * 100);
function De(e, t, n, r) {
	let { gsd: i, ox: a, oy: o } = e, [s, c] = ce(e.epsg, t, n), l = (s - a) / i - r / 2, u = (c - o) / i + r / 2, d = Math.round(l), f = Math.round(u), p = [];
	for (let e of [
		0,
		-1,
		1
	]) for (let t of [
		0,
		-1,
		1
	]) p.push([d + e, f + t]);
	p.sort((e, t) => (e[0] - l) ** 2 + (e[1] - u) ** 2 - ((t[0] - l) ** 2 + (t[1] - u) ** 2));
	let m = ([e, t]) => [
		a + e * i,
		o + (t - r) * i,
		a + (e + r) * i,
		o + t * i
	];
	for (let r of p) {
		let i = m(r);
		if (Ee(Oe(e.epsg, i), t, n)) return i;
	}
	return m(p[0]);
}
var Oe = (e, t) => le(e, (t[0] + t[2]) / 2, (t[1] + t[3]) / 2);
function ke(e, t) {
	if (t && /^\d{2}\.\d{2}$/.test(t)) return t >= "04.00" ? 1e3 : 0;
	let n = /_(\d{8})T\d{6}$/.exec(e);
	return n && n[1] < "20220125" ? 0 : 1e3;
}
var Ae = 275e-7, je = .2 / Ae;
function Me(e, t, n) {
	if (e === "sentinel-2-l2a") {
		let e = ke(t, n), r = [
			"B04",
			"B03",
			"B02"
		].map((t) => `sqrt(where(${t}>${e},${t}-${e},0))`).join(";");
		return `assets=B04&assets=B03&assets=B02&asset_as_band=true&expression=${encodeURIComponent(r)}&rescale=0,${Ne(100)}&nodata=0&reproject=lanczos`;
	}
	let r = Ne(je), i = Math.sqrt(1 / Ae), a = [
		"red",
		"green",
		"blue"
	].map((e) => `sqrt(where(${e}>${r},${e}-${r},0))`).join(";");
	return `assets=red&assets=green&assets=blue&asset_as_band=true&expression=${encodeURIComponent(a)}&rescale=0,${Ne(i)}&reproject=lanczos`;
}
var Ne = (e) => String(Math.round(e * 1e3) / 1e3);
function Pe(e, t, n, r, i = "png", a) {
	return `${X}/item/bbox/${_e(n)}/${r}x${r}.${i}?collection=${e}&item=${encodeURIComponent(t)}&${Me(e, t, a)}`;
}
var Fe = (e) => `coord_crs=EPSG:${e}&dst_crs=EPSG:${e}`;
function Ie(e, t, n, r, i, a = "png", o) {
	let s = i === Math.round((r[2] - r[0]) / n.gsd) ? "" : "&resampling=lanczos";
	return `${X}/item/bbox/${ye(r)}/${i}x${i}.${a}?collection=${e}&item=${encodeURIComponent(t)}&${Fe(n.epsg)}&${Me(e, t, o)}${s}`;
}
function Le(e, t, n, r, i, a, o = "png", s = !1) {
	let c = s ? null : we(e, n, r);
	return c ? Ie(e, t, c, De(c, n, r, Math.max(1, Math.round(2 * i * 1e3 / c.gsd))), a, o) : Pe(e, t, Q(n, r, i), a, o);
}
function Re(e, t, n) {
	return Q($(t), $(n), fe[e]);
}
var ze = (e) => e === "sentinel-2-l2a" ? "SCL" : "qa_pixel";
function Be(e, t, n, r) {
	return `${X}/item/bbox/${_e(Re(e, n, r))}/64x64.npy?collection=${e}&item=${encodeURIComponent(t)}&assets=${ze(e)}`;
}
var Ve = /^https:\/\/planetarycomputer\.microsoft\.com\/api\/data\/v1\/item\/bbox\/(-?[\d.]+),(-?[\d.]+),(-?[\d.]+),(-?[\d.]+)\/(\d+)x(\d+)\.(png|jpg)\?(.*)$/;
function He(e) {
	let t = e.get("coord_crs"), n = e.get("dst_crs");
	if (t === null && n === null) return 4326;
	let r = /^EPSG:(\d+)$/.exec(t ?? "");
	return !r || n !== t || !W(Number(r[1])) ? null : Number(r[1]);
}
var Ue = (e, t, n) => {
	let r = de[e];
	return {
		epsg: t,
		gsd: r,
		ox: be(Math.round(n[0] * 100) / 100, r),
		oy: be(Math.round(n[3] * 100) / 100, r)
	};
}, We = (e, t, n, r) => `${e}|${t}|${n.toFixed(2)},${r.toFixed(2)}`;
function Ge(e) {
	let t = Ve.exec(e);
	if (!t || !/(^|&)expression=/.test(t[8])) return null;
	let n = new URLSearchParams(t[8]), r = n.get("collection") ?? "", i = n.get("item") ?? "";
	if (!he(r) || !i) return null;
	let a = [
		Number(t[1]),
		Number(t[2]),
		Number(t[3]),
		Number(t[4])
	], o = Number(t[5]);
	if (!a.every(Number.isFinite) || !(a[2] > a[0]) || !(a[3] > a[1]) || !(o > 0)) return null;
	let s = He(n);
	if (s === null) return null;
	let c = t[7] === "jpg";
	if (s !== 4326) {
		let e = Ue(r, s, a), [t, n] = Oe(s, a), l = $(t), u = $(n);
		return {
			collection: r,
			itemId: i,
			box: a,
			crs: s,
			lat: l,
			lon: u,
			ref: De(e, l, u, me[r]),
			maskUrl: Be(r, i, l, u),
			px: o,
			metresPerPx: (a[2] - a[0]) / o,
			key: We(r, i, l, u),
			jpeg: c
		};
	}
	let l = $((a[1] + a[3]) / 2), u = $((a[0] + a[2]) / 2), d = (a[3] - a[1]) * ue * Z;
	return {
		collection: r,
		itemId: i,
		box: a,
		crs: s,
		lat: l,
		lon: u,
		ref: Q(l, u, pe[r]),
		maskUrl: Be(r, i, l, u),
		px: o,
		metresPerPx: d * 1e3 / o,
		key: We(r, i, l, u),
		jpeg: c
	};
}
var Ke = (e) => e.metresPerPx <= de[e.collection] * 1.6, qe = (e) => e.px > 1e3 && Ke(e);
// src/imagery/pcCrop.ts
function Je(e, t, n, r) {
	let { halfSizeKm: i, px: a } = j(r);
	return Le(e, t, n.lat, n.lon, i, a, "png", !!r.geographic);
}
var Ye = (e) => Ge(e) !== null;
function Xe(e, t, n) {
	return Be(e, t, n.lat, n.lon);
}
// src/imagery/net.ts
var Ze = 12e3, Qe = class extends Error {
	status;
	url;
	body;
	constructor(e, t, n) {
		super(`HTTP ${e} from ${ct(t)}`), this.name = "HttpError", this.status = e, this.url = t, this.body = n;
	}
	get retryable() {
		return this.status === 408 || this.status === 425 || this.status === 429 || this.status >= 500;
	}
}, $e = class extends Error {
	constructor(e, t) {
		super(`${ct(e)} did not answer within ${Math.round(t / 1e3)} s`), this.name = "TimeoutError";
	}
};
function et(e) {
	return typeof e == "object" && !!e && "name" in e && (e.name === "AbortError" || e.name === "CanceledError");
}
function tt(e) {
	let t = e.reason;
	if (t instanceof Error) return t;
	let n = Error(typeof t == "string" ? t : "Aborted");
	return n.name = "AbortError", n;
}
function nt(e) {
	if (e?.aborted) throw tt(e);
}
function rt(e, t) {
	return new Promise((n, r) => {
		if (t?.aborted) return r(tt(t));
		let i = setTimeout(() => {
			t?.removeEventListener("abort", a), n();
		}, e), a = () => {
			clearTimeout(i), r(tt(t));
		};
		t?.addEventListener("abort", a, { once: !0 });
	});
}
function it(e, t) {
	return t ? t.aborted ? Promise.reject(tt(t)) : new Promise((n, r) => {
		let i = () => r(tt(t));
		t.addEventListener("abort", i, { once: !0 }), e.then((e) => {
			t.removeEventListener("abort", i), n(e);
		}, (e) => {
			t.removeEventListener("abort", i), r(e);
		});
	}) : e;
}
function at(e) {
	return e instanceof Qe ? e.retryable : e instanceof $e || e instanceof TypeError;
}
async function ot(e, t = {}) {
	let { timeoutMs: n = Ze, retries: r = 1, retryDelayMs: i = 600, retryTimeouts: a = !0, signal: o, label: s = "request" } = t, c;
	for (let t = 0; t <= r; t++) {
		nt(o);
		let l = new AbortController(), u = !1, d = setTimeout(() => {
			u = !0, l.abort();
		}, n), f = () => l.abort(o?.reason);
		o?.addEventListener("abort", f, { once: !0 });
		try {
			return await e(l.signal);
		} catch (e) {
			if (o?.aborted) throw tt(o);
			if (c = u ? new $e(s, n) : e, !at(c) || t === r || u && !a) break;
		} finally {
			clearTimeout(d), o?.removeEventListener("abort", f);
		}
		await rt(i * (1 + Math.random() * .6), o);
	}
	throw c;
}
function st(e, t = {}) {
	let { method: n = t.body === void 0 ? "GET" : "POST", body: r, headers: i } = t;
	return ot(async (t) => {
		let a = await fetch(e, {
			method: n,
			signal: t,
			headers: r === void 0 ? i : {
				"content-type": "application/json",
				...i
			},
			body: r === void 0 ? void 0 : JSON.stringify(r)
		});
		if (!a.ok) {
			let t;
			try {
				t = (await a.text()).slice(0, 300);
			} catch {}
			throw new Qe(a.status, e, t);
		}
		return await a.json();
	}, {
		label: e,
		...t
	});
}
function ct(e) {
	try {
		return new URL(e).host;
	} catch {
		return e;
	}
}
async function lt(e, t, n) {
	let r = Array(e.length), i = 0;
	return await Promise.all(Array.from({ length: Math.min(t, e.length) }, async () => {
		for (; i < e.length;) {
			let t = i++;
			r[t] = await n(e[t], t);
		}
	})), r;
}
// api/_lib/radar.ts
var ut = "https://planetarycomputer.microsoft.com/api/data/v1", dt = "sentinel-1-rtc", ft = 10, pt = -32.5, mt = -30;
function ht(e, t) {
	let n = `where(${e}>${10 ** (mt / 10)},10*log10(${e}),${mt})`;
	return `assets=${e}&asset_as_band=true&expression=${encodeURIComponent(n)}&rescale=${pt},5${t ? "&resampling=average" : ""}&reproject=average`;
}
var gt = (e) => e.toFixed(6), _t = (e) => String(Math.round(e * 100) / 100);
function vt(e, t, n, r, i, a, o = "png", s = !1) {
	let c = `${ut}/item/bbox`, l = `collection=${dt}&item=${encodeURIComponent(e)}`, u = s ? null : we("sentinel-2-l2a", n, r);
	if (u) {
		let e = Math.max(1, Math.round(2 * i * 1e3 / ft));
		return `${c}/${De(u, n, r, e).map(_t).join(",")}/${a}x${a}.${o}?${l}&coord_crs=EPSG:${u.epsg}&dst_crs=EPSG:${u.epsg}&${ht(t, a !== e)}`;
	}
	return `${c}/${Q(n, r, i).map(gt).join(",")}/${a}x${a}.${o}?${l}&${ht(t, !0)}`;
}
var yt = /^https:\/\/planetarycomputer\.microsoft\.com\/api\/data\/v1\/item\/bbox\/[^?]+\.(png|jpg)\?collection=sentinel-1-rtc&.*expression=/, bt = (e) => yt.test(e), xt = 12, St = .01, Ct = .996, wt = 16, Tt = 1.15, Et = 37.5 / 255, Dt = (e, t, n) => [
	e[0] + (t[0] - e[0]) * n,
	e[1] + (t[1] - e[1]) * n,
	e[2] + (t[2] - e[2]) * n
], Ot = (e) => [
	e * 255,
	e * 255,
	e * 255
], kt = [
	20,
	23,
	28
], At = [
	169,
	199,
	211
], jt = [
	[0, kt],
	[.6, Dt(Ot(.53), At, .25)],
	[1, Dt(Ot(.93), At, .12)]
];
function Mt(e) {
	for (let t = 1; t < jt.length; t++) {
		let [n, r] = jt[t], [i, a] = jt[t - 1];
		if (e <= n) return Dt(a, r, (e - i) / (n - i));
	}
	return jt[jt.length - 1][1];
}
function Nt(e, t, n) {
	let r = n * t, i = 0;
	for (let t = xt; t < 256; t++) if (i += e[t], i >= r) return t;
	return 255;
}
function Pt(e) {
	let t = 0;
	for (let n = xt; n < 256; n++) t += e[n];
	if (!t) return null;
	let n = Nt(e, t, St), r = Nt(e, t, Ct), i = wt / Et;
	if (r - n < i) {
		let a = Nt(e, t, .5);
		n = Math.min(n, a - i / 2), r = Math.max(r, a + i / 2);
	}
	return [n, r];
}
function Ft(e, t, n) {
	let r = t * n;
	if (e.length < r * 4) throw Error("size");
	let i = /* @__PURE__ */ new Uint32Array(256);
	for (let t = 0; t < r * 4; t += 4) i[e[t]]++;
	let a = Pt(i), o = /* @__PURE__ */ new Uint8Array(768);
	if (a) {
		let [e, t] = a;
		for (let n = xt; n < 256; n++) {
			let [r, i, a] = Mt(Math.min(1, Math.max(0, (n - e) / (t - e))) ** +Tt);
			o[n * 3] = Math.max(1, Math.round(r)), o[n * 3 + 1] = Math.max(1, Math.round(i)), o[n * 3 + 2] = Math.max(1, Math.round(a));
		}
	}
	let s = 0;
	for (let t = 0; t < r * 4; t += 4) {
		let n = e[t];
		e[t] = o[n * 3], e[t + 1] = o[n * 3 + 1], e[t + 2] = o[n * 3 + 2], e[t + 3] = 255, n >= xt && s++;
	}
	return a ? s / r : 0;
}
// src/imagery/radar.ts
function It(e, t, n, r) {
	let { halfSizeKm: i, px: a } = j(r);
	return vt(e, t, n.lat, n.lon, i, a, "png", !!r.geographic);
}
// src/imagery/stac.ts
var Lt = {
	"sentinel-2a": 40697,
	"sentinel-2b": 42063,
	"sentinel-2c": 60989,
	"landsat-8": 39084,
	"landsat-9": 49260,
	"sentinel-1a": 39634,
	"sentinel-1c": 62261,
	"sentinel-1d": 66315
}, Rt = ["landsat-8", "landsat-9"];
function zt(e) {
	let t = e.trim().toLowerCase().replace(/[\s_]+/g, "-"), n = /^landsat-?(\d+)$/.exec(t);
	if (n) return `landsat-${n[1]}`;
	let r = /^sentinel-?2-?([a-z])$/.exec(t);
	return r ? `sentinel-2${r[1]}` : t;
}
var Bt = {
	"sentinel-2-l2a": 10,
	"landsat-c2-l2": 30
}, Vt = (e) => typeof e == "number" && Number.isFinite(e) ? e : void 0, Ht = (e) => typeof e == "string" && e ? e : void 0;
function Ut(e, t) {
	if (!e || !("coordinates" in e) || !Array.isArray(e.coordinates)) return;
	let n = (e) => e.filter((e) => e.length >= 2).map((e) => [e[0], e[1]]);
	if (e.type === "Polygon") {
		let t = e.coordinates;
		return t[0] ? n(t[0]) : void 0;
	}
	if (e.type === "MultiPolygon") {
		let r = e.coordinates.map((e) => n(e[0] ?? []));
		return r.find((e) => Zt(e, t)) ?? r[0];
	}
}
function Wt(e) {
	return e.links?.find((e) => e.rel === "self")?.href;
}
function Gt(e) {
	let t = /_(\d{8}T\d{6})(?:\.SAFE)?$/.exec(e);
	return t ? t[1] : "";
}
function Kt(e) {
	if (!e) return;
	let t = /^(S2[A-Z]_MSIL2A_\d{8}T\d{6})_N\d{4}_(R\d{3}_T\d{2}[A-Z]{3}_\d{8}T\d{6})(?:\.SAFE)?$/.exec(e.trim());
	return t ? `${t[1]}_${t[2]}` : void 0;
}
function qt(e) {
	return /^S2[A-Z]_MSIL2A_\d{8}T\d{6}_R\d{3}_T\d{2}[A-Z]{3}_\d{8}T\d{6}$/.test(e);
}
function Jt(e, t) {
	let n = e.properties, r = e.collection ?? Ht(n.collection);
	if (r !== "sentinel-2-l2a" && r !== "landsat-c2-l2") return;
	let i = Date.parse(Ht(n.datetime) ?? ""), a = zt(Ht(n.platform) ?? "");
	if (!Number.isFinite(i) || !a || r === "landsat-c2-l2" && !Rt.includes(a)) return;
	let o = Vt(n["s2:mean_solar_zenith"]), s = Vt(n["view:sun_elevation"]) ?? (o === void 0 ? void 0 : 90 - o), c = e.id, l = Se(r, n, e.assets) ?? (r === "sentinel-2-l2a" ? xe(c) : null) ?? void 0, u = {
		id: c,
		provider: "planetary-computer",
		collection: r,
		itemId: c,
		platform: a,
		norad: Lt[a],
		datetime: i,
		cloudCoverPct: Vt(n["eo:cloud_cover"]),
		gsdM: Bt[r],
		sunElevationDeg: s,
		footprint: Ut(e.geometry, t),
		cropUrl: (e) => Je(r, c, t, e),
		previewUrl: e.assets?.rendered_preview?.href,
		sourceUrl: Wt(e)
	};
	if (r === "sentinel-2-l2a") return {
		capture: u,
		processing: `${Ht(n["s2:processing_baseline"]) ?? ""}|${Gt(c) || (Ht(n["s2:generation_time"]) ?? "")}`,
		tile: Ht(n["s2:mgrs_tile"]),
		epsg: l
	};
	let d = Ht(n["landsat:wrs_path"]), f = Ht(n["landsat:wrs_row"]);
	return {
		capture: u,
		processing: `${Ht(n["landsat:collection_number"]) ?? ""}|${Ht(n.created) ?? ""}`,
		tile: d && f ? `${d}/${f}` : void 0,
		epsg: l
	};
}
function Yt(e, t) {
	let n = e.properties, r = Date.parse(Ht(n.datetime) ?? ""), i = zt(Ht(n.platform) ?? "");
	if (!Number.isFinite(r) || !i.startsWith("sentinel-2")) return;
	let a = Ht(n["s2:product_uri"]), o = Kt(a), s = e.assets?.thumbnail?.href, c = o ?? e.id, l = {
		id: c,
		provider: "earth-search",
		collection: "sentinel-2-l2a",
		itemId: c,
		platform: i,
		norad: Lt[i],
		datetime: r,
		cloudCoverPct: Vt(n["eo:cloud_cover"]),
		gsdM: Bt["sentinel-2-l2a"],
		sunElevationDeg: Vt(n["view:sun_elevation"]),
		footprint: Ut(e.geometry, t),
		cropUrl: o ? (e) => Je("sentinel-2-l2a", o, t, e) : () => s ?? "",
		previewUrl: s,
		sourceUrl: Wt(e)
	}, u = [
		n["mgrs:utm_zone"],
		n["mgrs:latitude_band"],
		n["mgrs:grid_square"]
	], d = Vt(n["mgrs:utm_zone"]), f = Ht(n["mgrs:latitude_band"]);
	return {
		capture: l,
		processing: `${Ht(n["s2:processing_baseline"]) ?? ""}|${a ? Gt(a) : ""}`,
		tile: u.every((e) => e !== void 0) ? u.join("") : void 0,
		epsg: (o ? xe(o) : null) ?? (d && f ? (f >= "N" ? 32600 : 32700) + d : void 0)
	};
}
function Xt(e, t) {
	let n = e.properties, r = Date.parse(Ht(n.datetime) ?? ""), i = zt(Ht(n.platform) ?? "");
	if (!Number.isFinite(r) || !i.startsWith("sentinel-1")) return;
	let a = Array.isArray(n["sar:polarizations"]) ? n["sar:polarizations"].map((e) => String(e).toLowerCase()) : [], o = a.includes("vv") && e.assets?.vv ? "vv" : a.includes("hh") && e.assets?.hh ? "hh" : void 0;
	if (!o) return;
	let s = e.id, c = n["proj:code"], l = typeof c == "string" && /^EPSG:\d+$/.test(c) ? Number(c.slice(5)) : Vt(n["proj:epsg"]);
	return {
		capture: {
			id: s,
			provider: "planetary-computer",
			collection: dt,
			itemId: s,
			platform: i,
			norad: Lt[i],
			datetime: r,
			gsdM: 20,
			footprint: Ut(e.geometry, t),
			cropUrl: (e) => It(s, o, t, e),
			previewUrl: e.assets?.rendered_preview?.href,
			sourceUrl: Wt(e)
		},
		processing: Ht(n["s1:processing_datetime"]) ?? Ht(n.created) ?? "",
		epsg: l
	};
}
function Zt(e, t) {
	let n = !1;
	for (let r = 0, i = e.length - 1; r < e.length; i = r++) {
		let [a, o] = e[r], [s, c] = e[i];
		o > t.lat != c > t.lat && t.lon < (s - a) * (t.lat - o) / (c - o) + a && (n = !n);
	}
	return n;
}
function Qt(e, t) {
	if (!e || e.length < 3) return 0;
	let n = 111.32 * Math.cos(t.lat * Math.PI / 180), r = e.map(([e, r]) => [(((e - t.lon) % 360 + 540) % 360 - 180) * n, (r - t.lat) * 110.57]), i = Infinity;
	for (let e = 0, t = r.length - 1; e < r.length; t = e++) {
		let [n, a] = r[t], [o, s] = r[e], c = o - n, l = s - a, u = c * c + l * l, d = u ? Math.max(0, Math.min(1, -(n * c + a * l) / u)) : 0;
		i = Math.min(i, Math.hypot(n + d * c, a + d * l));
	}
	return Zt(e, t) ? i : -i;
}
var $t = 12e4;
function en(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let t of e) {
		let e = `${t.capture.platform}|${t.capture.datetime}|${t.tile ?? t.capture.itemId}`, r = n.get(e);
		(!r || t.processing > r.processing) && n.set(e, t);
	}
	let r = [...n.values()].sort((e, t) => e.capture.platform.localeCompare(t.capture.platform) || e.capture.datetime - t.capture.datetime), i = new Map(r.map((e) => [e, Qt(e.capture.footprint, t)])), a = (e) => Te(e.epsg, t.lat, t.lon), o = (e) => i.get(e) >= (fe[e.capture.collection] ?? (e.capture.collection === "sentinel-1-rtc" ? 10 : 5)) * Math.SQRT2, s = (e, t) => {
		let n = a(e);
		if (n !== a(t) && o(n ? e : t)) return n;
		let r = i.get(e) - i.get(t);
		return Math.abs(r) > .05 ? r > 0 : e.processing === t.processing ? (e.capture.cloudCoverPct ?? 101) < (t.capture.cloudCoverPct ?? 101) : e.processing > t.processing;
	}, c = [], l;
	for (let e of r) {
		let t = c[c.length - 1];
		t && l && e.capture.platform === l.capture.platform && e.capture.datetime - l.capture.datetime <= $t ? s(e, t) && (c[c.length - 1] = e) : (c.push(e), l = e);
	}
	return c.sort((e, t) => t.capture.datetime - e.capture.datetime);
}
var tn = 12e3, nn = {
	timeoutMs: 8e3,
	retryTimeouts: !1
};
function rn(e) {
	return (/* @__PURE__ */ new Date(Math.floor(e / 1e3) * 1e3)).toISOString().replace(/\.\d{3}Z$/, "Z");
}
function an(e, t, n, r) {
	let i = {
		collections: [e],
		intersects: {
			type: "Point",
			coordinates: [on(t.lon), on(t.lat)]
		},
		datetime: `${rn(n)}/${rn(Math.ceil(r / 1e3) * 1e3)}`,
		limit: 100
	};
	return e === "landsat-c2-l2" && (i.query = { platform: { in: [...Rt] } }), i;
}
var on = (e) => Math.round(e * 1e6) / 1e6;
function sn(e, t) {
	let n = new URLSearchParams();
	for (let [e, r] of Object.entries(t)) if (r !== void 0) {
		if (e === "collections" && Array.isArray(r) && r.every((e) => typeof e == "string" && !e.includes(","))) n.set(e, r.join(","));
		else if (e === "sortby" && Array.isArray(r) && r.every(cn)) n.set(e, r.map((e) => (e.direction === "desc" ? "-" : "+") + e.field).join(","));
		else if ((e === "intersects" || e === "query") && typeof r == "object" && r) n.set(e, JSON.stringify(r));
		else if (e === "datetime" && typeof r == "string") n.set(e, r);
		else if (e === "limit" && typeof r == "number" && Number.isInteger(r)) n.set(e, String(r));
		else return;
	}
	let r = `${e}?${n}`;
	return r.length <= ln ? r : void 0;
}
var cn = (e) => typeof e == "object" && !!e && typeof e.field == "string" && !e.field.includes(",") && ["asc", "desc"].includes(e.direction ?? ""), ln = 1800, un = /* @__PURE__ */ new Set();
async function dn(e, t, n) {
	let r = un.has(e) ? void 0 : sn(e, t);
	if (r) try {
		return await st(r, n);
	} catch (t) {
		if (!(t instanceof Qe) || t.retryable || n.signal?.aborted) throw t;
		un.add(e);
	}
	return st(e, {
		...n,
		body: t
	});
}
async function fn(e, t, n, r = {}) {
	let i = /* @__PURE__ */ new Map(), a = {
		signal: n,
		timeoutMs: tn,
		retries: 1,
		...r
	}, o = await dn(e, t, a), s = t;
	for (let e = 0;; e++) {
		for (let e of o.features ?? []) i.set(e.id, e);
		let t = o.links?.find((e) => e.rel === "next");
		if (!t || e >= 9 || !(o.features?.length > 0)) break;
		if ((t.method ?? "GET").toUpperCase() === "POST") {
			let e = t.merge ? {
				...s,
				...t.body
			} : t.body ?? s;
			if (JSON.stringify(e) === JSON.stringify(s)) break;
			o = await st(t.href, {
				...a,
				body: e
			}), s = e;
		} else o = await st(t.href, a);
	}
	return [...i.values()];
}
async function pn(e, t, n, r, i) {
	return (await fn(E, an(e, t, n, r), i, nn)).map((n) => Jt({
		...n,
		collection: n.collection ?? e
	}, t)).filter((e) => !!e);
}
async function mn(e, t, n, r) {
	return (await fn(D, an("sentinel-2-c1-l2a", e, t, n), r, nn)).map((t) => Yt(t, e)).filter((e) => !!e);
}
async function hn(e, t, n, r, i) {
	if (nt(r), !(n > t) || !Number.isFinite(e.lat) || !Number.isFinite(e.lon)) return {
		captures: [],
		degraded: []
	};
	let a = [], o = (t) => {
		if (i && t.length && !r?.aborted) try {
			i(en(t, e).map((e) => e.capture));
		} catch (e) {
			console.error(e);
		}
	}, s = (async () => {
		try {
			let i = await pn("sentinel-2-l2a", e, t, n, r);
			return o(i), i;
		} catch (i) {
			if (et(i) || r?.aborted) throw i;
			let s = await mn(e, t, n, r);
			return o(s), a.push(s.some((e) => e.capture.provider === "earth-search" && !qt(e.capture.itemId)) ? "Sentinel-2 listed via Earth Search; some scenes show a full-scene thumbnail, not a crop." : "Sentinel-2 listed via Earth Search (Planetary Computer search unavailable)."), s;
		}
	})(), c = pn("landsat-c2-l2", e, t, n, r), [l, u] = await Promise.allSettled([s, c]);
	if (nt(r), l.status === "rejected" && u.status === "rejected") throw Error("Sentinel-2 and Landsat archives are unreachable right now.", { cause: l.reason });
	return l.status === "rejected" && a.push("Sentinel-2 archive unreachable; Sentinel-2 images may be missing."), u.status === "rejected" && a.push("Landsat archive unreachable; Landsat images may be missing."), {
		captures: en([...l.status === "fulfilled" ? l.value : [], ...u.status === "fulfilled" ? u.value : []], e).map((e) => e.capture),
		degraded: a
	};
}
async function gn(e, t, n, r) {
	return nt(r), !(n > t) || !Number.isFinite(e.lat) || !Number.isFinite(e.lon) ? [] : en((await fn(E, an(dt, e, t, n), r)).map((t) => Xt(t, e)).filter((e) => !!e), e).map((e) => e.capture);
}
var _n = 12;
function vn(e, t, n, r, i = _n) {
	let a = an(e, t, n, r), o = {
		...a.query ?? {},
		"eo:cloud_cover": { lt: 20 }
	};
	return {
		...a,
		limit: i,
		query: o,
		sortby: [{
			field: "datetime",
			direction: "desc"
		}]
	};
}
async function yn(e, t, n, r) {
	if (nt(r), !(n > t) || !Number.isFinite(e.lat) || !Number.isFinite(e.lon)) return [];
	let i = async (i) => ((await dn("https://planetarycomputer.microsoft.com/api/stac/v1/search", vn(i, e, t, n), {
		signal: r,
		timeoutMs: tn,
		retries: 1
	})).features ?? []).map((t) => Jt({
		...t,
		collection: t.collection ?? i
	}, e)).filter((e) => !!e && (e.capture.cloudCoverPct ?? 100) < 20), a = await Promise.allSettled([i("sentinel-2-l2a"), i("landsat-c2-l2")]);
	return nt(r), en(a.flatMap((e) => e.status === "fulfilled" ? e.value : []), e).map((e) => e.capture);
}
var bn = 7776e6;
async function xn(e, t, n) {
	nt(n);
	let r = {
		...an("sentinel-2-l2a", e, t - bn, t),
		limit: 1
	};
	try {
		let e = await dn(E, r, {
			signal: n,
			timeoutMs: 6e3,
			retries: 1
		});
		return Array.isArray(e.features) ? e.features.length > 0 : void 0;
	} catch (e) {
		if (et(e) || n?.aborted) throw e;
		return;
	}
}
// src/imagery/gibsTiles.ts
var Sn = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best", Cn = "GoogleMapsCompatible_Level9", wn = 9, Tn = 40075016.686, En = Math.PI / 180, Dn = (e) => e.startsWith(Sn);
function On(e, t, n, r, i) {
	if (!(Math.abs(n.lat) <= 85) || !Number.isFinite(n.lon)) return;
	let a = Math.cos(n.lat * En), o = Math.max(0, Math.min(wn, Math.ceil(Math.log2(Tn * a / (256 * i * 1e3))))), s = 2 ** o, c = ((n.lon + 180) % 360 + 360) % 360 / 360 * s, l = (1 - Math.asinh(Math.tan(n.lat * En)) / Math.PI) / 2 * s, u = Math.min(s - 1, Math.floor(c)), d = Math.min(s - 1, Math.max(0, Math.floor(l))), f = (c - u) * 256, p = (l - d) * 256, m = r * 1e3 / (Tn * a / (s * 256)), h = Math.max(0, Math.floor(f - m)), g = Math.max(0, Math.floor(p - m)), _ = Math.min(256, Math.ceil(f + m)), v = Math.min(256, Math.ceil(p + m));
	return `${Sn}/${encodeURIComponent(e)}/default/${t}/${Cn}/${o}/${d}/${u}.jpg#win=${h},${g},${_ - h},${v - g}`;
}
function kn(e) {
	let t = /#win=(\d+),(\d+),(\d+),(\d+)$/.exec(e);
	if (!t) return;
	let [n, r, i, a] = t.slice(1).map(Number);
	return i > 0 && a > 0 ? {
		x: n,
		y: r,
		w: i,
		h: a
	} : void 0;
}
// src/imagery/lru.ts
var An = class {
	map = /* @__PURE__ */ new Map();
	max;
	onEvict;
	constructor(e, t) {
		if (!(e >= 1)) throw RangeError("Lru max must be ≥ 1");
		this.max = Math.floor(e), this.onEvict = t;
	}
	get size() {
		return this.map.size;
	}
	has(e) {
		return this.map.has(e);
	}
	get(e) {
		if (!this.map.has(e)) return;
		let t = this.map.get(e);
		return this.map.delete(e), this.map.set(e, t), t;
	}
	peek(e) {
		return this.map.get(e);
	}
	set(e, t) {
		for (this.map.has(e) && this.map.delete(e), this.map.set(e, t); this.map.size > this.max;) {
			let e = this.map.keys().next().value, t = this.map.get(e);
			this.map.delete(e), this.onEvict?.(e, t);
		}
		return this;
	}
	delete(e) {
		return this.map.delete(e);
	}
	clear() {
		this.map.clear();
	}
	keys() {
		return this.map.keys();
	}
};
function jn(e, t, n) {
	let r = e.get(t);
	if (r) return r;
	let i = n();
	return e.set(t, i), i.catch(() => {
		e.peek(t) === i && e.delete(t);
	}), i;
}
// api/_lib/tone.ts
function Mn(e) {
	let t = e instanceof Uint8Array ? e : new Uint8Array(e);
	if (t.length < 10 || t[0] !== 147 || String.fromCharCode(...t.subarray(1, 6)) !== "NUMPY") throw Error("not an npy file");
	let n = t[6], r = n >= 2 ? t[8] | t[9] << 8 | t[10] << 16 | t[11] << 24 : t[8] | t[9] << 8, i = n >= 2 ? 12 : 10, a = "";
	for (let e = i; e < i + r; e++) a += String.fromCharCode(t[e]);
	let o = /'descr':\s*'([^']+)'/.exec(a)?.[1], s = /'shape':\s*\(([^)]*)\)/.exec(a)?.[1];
	if (!o || s === void 0 || /'fortran_order':\s*True/.test(a)) throw Error("unsupported npy header");
	let c = s.split(",").map((e) => e.trim()).filter(Boolean).map(Number), l = c.reduce((e, t) => e * t, 1), u = i + r, d = Uint8Array.prototype.slice.call(t, u), f = {
		"|u1": Uint8Array,
		"<u1": Uint8Array,
		"<u2": Uint16Array,
		"<i2": Int16Array,
		"<u4": Uint32Array,
		"<i4": Int32Array,
		"<f4": Float32Array,
		"<f8": Float64Array
	}[o];
	if (!f) throw Error(`unsupported npy dtype ${o}`);
	let p = l * f.BYTES_PER_ELEMENT;
	if (d.byteLength < p) throw Error("truncated npy");
	return {
		shape: c,
		data: new f(d.buffer, d.byteOffset, l)
	};
}
var Nn = {
	NoData: 0,
	Clear: 1,
	Cloud: 2,
	Cirrus: 3,
	Shadow: 4
};
function Pn(e) {
	return e === 8 || e === 9 ? Nn.Cloud : e === 10 ? Nn.Cirrus : e === 3 ? Nn.Shadow : e === 0 || e === 1 ? Nn.NoData : Nn.Clear;
}
function Fn(e) {
	return e & 1 ? Nn.NoData : e & 14 ? Nn.Cloud : e & 16 ? Nn.Shadow : Nn.Clear;
}
function In(e, t, n) {
	let [r, i, a] = n.shape.length === 3 ? n.shape : [
		1,
		n.shape[0],
		n.shape[1]
	];
	if (!(i > 0 && a > 0) || n.data.length < r * i * a) throw Error("bad mask shape");
	let o = a * i, s = new Uint16Array(o), c = new Uint8Array(o), l = e === "sentinel-2-l2a" ? Pn : Fn, u = r >= 2;
	for (let e = 0; e < o; e++) {
		let t = Number(n.data[e]);
		s[e] = t;
		let i = !u || Number(n.data[(r - 1) * o + e]) > 0;
		c[e] = i ? l(t) : Nn.NoData;
	}
	return {
		collection: e,
		box: t,
		w: a,
		h: i,
		raw: s,
		cls: c
	};
}
var Ln = /\/item\/bbox\/(-?[\d.]+),(-?[\d.]+),(-?[\d.]+),(-?[\d.]+)\/\d+x\d+\.npy\?(.*)$/;
function Rn(e, t) {
	let n = Ln.exec(e), r = n ? new URLSearchParams(n[5]) : null, i = r?.get("collection") ?? "";
	if (!n || !r || !he(i) || r.has("coord_crs") || r.has("dst_crs")) throw Error("not a mask URL");
	return In(i, [
		Number(n[1]),
		Number(n[2]),
		Number(n[3]),
		Number(n[4])
	], Mn(t));
}
function zn(e, t, n) {
	let r = Math.floor((t - e.box[0]) / (e.box[2] - e.box[0]) * e.w), i = Math.floor((e.box[3] - n) / (e.box[3] - e.box[1]) * e.h);
	return r >= 0 && i >= 0 && r < e.w && i < e.h ? i * e.w + r : -1;
}
function Bn(e, t, n) {
	let r = (e.box[0] + e.box[2]) / 2;
	return [n + 360 * Math.round((r - n) / 360), t];
}
function Vn(e, t, n) {
	let [r, i] = Bn(e, t, n);
	return zn(e, r, i);
}
var Hn = 8;
function Un(e, t, n) {
	if (t === 4326) return null;
	let r = (n, r) => {
		let [i, a] = le(t, n, r);
		return Bn(e, i, a);
	}, i = Hn, [a, o, s, c] = n, l = (s - a) / i, u = (c - o) / i, d = /* @__PURE__ */ new Float64Array(81), f = /* @__PURE__ */ new Float64Array(81);
	for (let e = 0; e <= i; e++) for (let t = 0; t <= i; t++) {
		let [n, i] = r(a + t * l, o + e * u);
		d[e * 9 + t] = n, f[e * 9 + t] = i;
	}
	return (e, t) => {
		let n = (e - a) / l, r = (t - o) / u, s = Math.min(7, Math.max(0, Math.floor(n))), c = Math.min(7, Math.max(0, Math.floor(r))), p = n - s, m = r - c, h = c * 9 + s, g = (1 - p) * (1 - m), _ = p * (1 - m), v = (1 - p) * m, y = p * m;
		return [g * d[h] + _ * d[h + 1] + v * d[h + i + 1] + y * d[h + i + 2], g * f[h] + _ * f[h + 1] + v * f[h + i + 1] + y * f[h + i + 2]];
	};
}
function Wn(e) {
	let t = 0, n = 0;
	for (let r = 0; r < e.cls.length; r++) {
		let i = e.cls[r];
		i !== Nn.NoData && (t++, i === Nn.Clear ? n += 1 : i === Nn.Cirrus && (n += .5));
	}
	return t >= e.cls.length / 2 ? n / t : void 0;
}
var Gn = (e) => e / 255 * (e / 255), Kn = 1.2, qn = .55, Jn = .8, Yn = .42, Xn = .06, Zn = .85, Qn = 99.5, $n = 4096, er = 512, tr = 6, nr = 2, rr = 25e4, ir = {
	black: 0,
	white: .35,
	gamma: .8,
	saturation: Kn
}, ar = .55, or = .5, sr = 512, cr = 8, lr = null;
function ur() {
	if (!lr) {
		lr = /* @__PURE__ */ new Float32Array(4097);
		for (let e = 0; e < lr.length; e++) lr[e] = (e / sr) ** +ar;
	}
	return lr;
}
var dr = null;
function fr() {
	if (!dr) {
		dr = /* @__PURE__ */ new Float32Array(256);
		for (let e = 0; e < 256; e++) dr[e] = Gn(e);
	}
	return dr;
}
var pr = (e, t, n) => {
	let r = Math.min(1, Math.max(0, (n - e) / (t - e)));
	return r * r * (3 - 2 * r);
};
function mr(e, t, n, r = 1) {
	if (t <= 0) return 0;
	let i = n / 100 * t, a = 0;
	for (let t = 0; t < e.length; t++) {
		let n = a + e[t];
		if (n >= i && e[t] > 0) return (t + (i - a) / e[t]) / e.length * r;
		a = n;
	}
	return r;
}
function hr(e, t, n, r, i, a) {
	let o = sr / r, s = e * o >= sr * cr ? (e / r) ** +ar : a[Math.round(e * o)], c = t * o >= sr * cr ? (t / r) ** +ar : a[Math.round(t * o)], l = n * o >= sr * cr ? (n / r) ** +ar : a[Math.round(n * o)], u = .2126 * s + .7152 * c + .0722 * l;
	return u > 1e-6 ? 1 + i * (Math.max(s, c, l) / u - 1) : 1;
}
function gr(e, t, n) {
	let r = Math.min(.95, Math.max(.02, (n - e) / (t - e))), i = Yn + .06 * pr(.1, .18, n * 1);
	return Math.min(Jn, Math.max(qn, Math.log(i) / Math.log(r)));
}
var _r = .6;
function vr(e, t) {
	let n = Math.log(t / (1.6 * de[e])) / Math.log(5);
	return 1 + .25 * Math.min(1, Math.max(0, n));
}
function yr(e, t, n, r, i, a, o, s = 1, c = 4326) {
	let l = t / (r[2] - r[0]), u = n / (r[3] - r[1]), d = Math.max(0, Math.floor((i[0] - r[0]) * l)), f = Math.min(t, Math.ceil((i[2] - r[0]) * l)), p = Math.max(0, Math.floor((r[3] - i[3]) * u)), m = Math.min(n, Math.ceil((r[3] - i[1]) * u));
	(f - d < 4 || m - p < 4) && (d = 0, p = 0, f = t, m = n);
	let h = Math.max(1, Math.floor(Math.sqrt((f - d) * (m - p) / rr))), g = fr(), _ = ur(), v = [
		0,
		1,
		2
	].map(() => ({
		r: new Uint32Array($n),
		g: new Uint32Array($n),
		b: new Uint32Array($n),
		L: new Uint32Array($n),
		n: 0
	})), y = Math.ceil((f - d) / h) * Math.ceil((m - p) / h), b = new Float32Array(y), x = new Float32Array(y), S = new Float32Array(y), C = new Uint8Array(y), w = 0, T = (e) => Math.min(4095, Math.max(0, Math.floor(e * $n))), E = (r[2] - r[0]) / t, D = (r[3] - r[1]) / n, O = a ? Cr(a) : null, k = a ? Un(a, c, r) : null;
	for (let n = p; n < m; n += h) {
		let i = r[3] - (n + .5) * D;
		for (let o = d; o < f; o += h) {
			let s = (n * t + o) * 4, c = e[s], l = e[s + 1], u = e[s + 2];
			if (e[s + 3] < 128 || c + l + u === 0) continue;
			let d = g[c], f = g[l], p = g[u], m = .2126 * d + .7152 * f + .0722 * p, h = 7;
			if (a && O) {
				let e = r[0] + (o + .5) * E, t = k ? zn(a, ...k(e, i)) : zn(a, e, i);
				t >= 0 && (O[t] & xr || a.cls[t] === Nn.Shadow ? h = 1 : O[t] & Sr && (h = 5));
			}
			let _ = T(d), y = T(f), D = T(p), ee = T(m);
			for (let e = 0; e < 3; e++) {
				if (!(h & 1 << e)) continue;
				let t = v[e];
				t.r[_]++, t.g[y]++, t.b[D]++, t.L[ee]++, t.n++;
			}
			b[w] = d, x[w] = f, S[w] = p, C[w++] = h;
		}
	}
	let ee = v[0];
	if (ee.n < 64) return ir;
	let te = (e) => e >= Math.max(256, ee.n * .03), A = te(v[1].n) ? 1 : te(v[2].n) ? 2 : 0, j = A === 0, M = v[A], N = Math.min(Xn, Math.max(0, Math.min(mr(M.r, M.n, .5), mr(M.g, M.n, .5), mr(M.b, M.n, .5)))), ne = mr(M.L, M.n, 50), re = mr(M.L, M.n, Qn), P = j ? Zn : nr, F = Math.max(N + .02, Math.min(re, P)), I = gr(N, F, ne), L = re, R = new Uint32Array($n), ie = 1 << A, z = or * N, B = new Float32Array(w), V = new Uint16Array(w);
	for (let e = 0; e < w; e++) {
		let t = .2126 * b[e] + .7152 * x[e] + .0722 * S[e];
		B[e] = t - N;
		let n = t - z > 1e-6 ? hr(Math.max(0, b[e] - z), Math.max(0, x[e] - z), Math.max(0, S[e] - z), t - z, Kn, _) : 1;
		V[e] = Math.min(er * tr, Math.max(0, Math.round((n - 1) * er)));
	}
	let H = /* @__PURE__ */ new Float32Array(3073);
	for (let e = 0; e < 4; e++) {
		R.fill(0);
		let e = 0, t = 1 / I;
		for (let e = 0; e < H.length; e++) H[e] = (1 + e / er) ** +t;
		for (let t = 0; t < w; t++) {
			if (!(C[t] & ie)) continue;
			let n = B[t], r = N + (n > 0 ? n * H[V[t]] : n), i = Math.floor(r / nr * $n);
			R[i < 0 ? 0 : i >= $n ? 4095 : i]++, e++;
		}
		L = Math.max(re, mr(R, e, Qn, nr));
		let n = F;
		if (F = Math.max(N + .02, Math.min(L, P)), I = gr(N, F, ne), Math.abs(F - n) < 1e-4) break;
	}
	return s > 1 && !j && F < _r && (F = Math.min(_r, N + (F - N) * s), I = gr(N, F, ne)), o && Object.assign(o, {
		median: ne,
		whiteL: re,
		whiteE: L,
		whiteCap: P,
		cloudy: j,
		groundShare: v[1].n / ee.n,
		use: A
	}), {
		black: br(N),
		white: br(F),
		gamma: Math.round(I * 1e3) / 1e3,
		saturation: Kn
	};
}
var br = (e) => Math.round(e * 1e4) / 1e4, xr = 1, Sr = 2;
function Cr(e) {
	let t = new Uint8Array(e.w * e.h);
	for (let n = 0; n < e.h; n++) for (let r = 0; r < e.w; r++) {
		let i = e.cls[n * e.w + r], a = i === Nn.Cloud ? xr : i === Nn.Cirrus ? Sr : 0;
		if (a) for (let i = -1; i <= 1; i++) {
			let o = n + i;
			if (!(o < 0 || o >= e.h)) for (let n = -1; n <= 1; n++) {
				let i = r + n;
				i >= 0 && i < e.w && (t[o * e.w + i] |= a);
			}
		}
	}
	return t;
}
function wr(e, t) {
	let n = .6 * de[e] / t;
	return n < .45 ? 0 : Math.min(2.5, Math.round(n * 100) / 100);
}
var Tr = .55, Er = 4096;
function Dr(e) {
	let t = Math.max(1, Math.ceil(e * 3)), n = new Float32Array(2 * t + 1), r = 0;
	for (let i = -t; i <= t; i++) r += n[i + t] = Math.exp(-i * i / (2 * e * e));
	for (let e = 0; e < n.length; e++) n[e] /= r;
	return n;
}
var Or = 32;
function* kr(e, t, n, r, i) {
	let a = new Float32Array(n * r), o = t ? new Float32Array(n * r) : null;
	for (let s = 0; s < r; s++) Ar(e, t, n, s, i, a, o), s % Or === 31 && (yield);
	let s = new Float32Array(n * r);
	for (let e = 0; e < r; e++) jr(a, o, n, r, e, i, s), e % Or === 31 && (yield);
	return s;
}
function Ar(e, t, n, r, i, a, o) {
	let s = i.length - 1 >> 1, c = r * n;
	for (let r = 0; r < n; r++) {
		let l = 0, u = 0;
		for (let a = -s; a <= s; a++) {
			let o = r + a < 0 ? 0 : r + a >= n ? n - 1 : r + a, d = i[a + s];
			if (t) {
				let n = t[c + o] * d;
				l += e[c + o] * n, u += n;
			} else l += e[c + o] * d;
		}
		a[c + r] = l, o && (o[c + r] = u);
	}
}
function jr(e, t, n, r, i, a, o) {
	let s = a.length - 1 >> 1;
	for (let c = 0; c < n; c++) {
		let l = 0, u = 0;
		for (let o = -s; o <= s; o++) {
			let d = i + o < 0 ? 0 : i + o >= r ? r - 1 : i + o, f = a[o + s];
			l += e[d * n + c] * f, t && (u += t[d * n + c] * f);
		}
		o[i * n + c] = t ? u > 1e-6 ? l / u : 0 : l;
	}
}
function* Mr(e, t, n, r, i, a = !1) {
	let o = /* @__PURE__ */ new Float32Array(4097);
	for (let e = 0; e <= Er; e++) o[e] = (e / Er) ** +r.gamma * 255;
	let s = t * n, c = 0, l = Or * t, u = {
		keys: new Int32Array(Nr).fill(-1),
		vals: new Int32Array(Nr)
	};
	for (let t = 0; t < s; t += l) t && (yield), c += Pr(e, t, Math.min(s, t + l), o, r, u);
	if (a && (yield, yield* Rr(e, t, n)), !(i > 0)) return;
	yield;
	let d = new Float32Array(s), f = new Uint8Array(s);
	for (let t = 0; t < s; t += l) t && (yield), Fr(e, t, Math.min(s, t + l), d, f);
	let p = null;
	if (c) {
		p = new Float32Array(s);
		for (let e = 0; e < s; e++) p[e] = f[e];
	}
	yield;
	let m = yield* kr(d, p, t, n, Dr(i));
	for (let t = 0; t < s; t += l) yield, Ir(e, t, Math.min(s, t + l), d, m, f);
}
var Nr = 65536;
function Pr(e, t, n, r, i, a) {
	let { keys: o, vals: s } = a, c = fr(), l = ur(), u = i.black, d = or * u, f = i.white - i.black, p = i.saturation, m = 0;
	for (let i = t, a = t * 4; i < n; i++, a += 4) {
		let t = e[a], n = e[a + 1], i = e[a + 2];
		if (t + n + i === 0) {
			m++;
			continue;
		}
		let h = t << 16 | n << 8 | i, g = Math.imul(h, 2654435761) >>> 16;
		if (o[g] === h) {
			let t = s[g];
			e[a] = t >>> 16, e[a + 1] = t >>> 8 & 255, e[a + 2] = t & 255;
			continue;
		}
		let _ = c[t], v = c[n], y = c[i], b = .2126 * _ + .7152 * v + .0722 * y, x = b - u, S = x <= 0 ? 0 : r[Math.round((x >= f ? 1 : x / f) * Er)], C = S, w = S, T = S;
		if (S > 0 && b - d > 1e-6) {
			let e = 1 / (b - d), t = _ > d ? (_ - d) * e : 0, n = v > d ? (v - d) * e : 0, r = y > d ? (y - d) * e : 0, i = t >= cr ? t ** +ar : l[Math.round(t * sr)], a = n >= cr ? n ** +ar : l[Math.round(n * sr)], o = r >= cr ? r ** +ar : l[Math.round(r * sr)], s = .2126 * i + .7152 * a + .0722 * o;
			if (s > 1e-6) {
				let e = p / s, t = 1 - p + i * e, n = 1 - p + a * e, r = 1 - p + o * e, c = t > n ? t > r ? t : r : n > r ? n : r, l = t < n ? t < r ? t : r : n < r ? n : r, u = 1;
				S * c > 255 && (u = S >= 255 ? 0 : (255 - S) / (S * (c - 1))), l < 0 && 1 / (1 - l) < u && (u = 1 / (1 - l)), u < 1 && (t = 1 + u * (t - 1), n = 1 + u * (n - 1), r = 1 + u * (r - 1)), C = S * t, w = S * n, T = S * r;
			}
		}
		let E = Lr(C), D = Lr(w), O = Lr(T), k = +(E + D + O === 0);
		e[a] = E + k, e[a + 1] = D + k, e[a + 2] = O + k, o[g] = h, s[g] = E + k << 16 | D + k << 8 | O + k;
	}
	return m;
}
function Fr(e, t, n, r, i) {
	for (let a = t, o = t * 4; a < n; a++, o += 4) e[o] + e[o + 1] + e[o + 2] !== 0 && (r[a] = .2126 * e[o] + .7152 * e[o + 1] + .0722 * e[o + 2], i[a] = 1);
}
function Ir(e, t, n, r, i, a) {
	for (let o = t, s = t * 4; o < n; o++, s += 4) {
		if (a[o] === 0) continue;
		let t = r[o] - i[o];
		if (t < 2 && t > -2) continue;
		let n = Tr * (t > 16 ? 16 : t < -16 ? -16 : t);
		e[s] = Lr(e[s] + n), e[s + 1] = Lr(e[s + 1] + n), e[s + 2] = Lr(e[s + 2] + n);
	}
}
var Lr = (e) => e <= 0 ? 0 : e >= 255 ? 255 : Math.round(e);
function* Rr(e, t, n) {
	let r = t * 4, i = (t, n, r, i) => {
		for (let a = 0; a < 3; a++) {
			let o = e[t + a], s = e[n + a], c = e[r + a], l = e[i + a], u = c - s;
			u === 0 || u > 10 || u < -10 || o - s > 3 || s - o > 3 || l - c > 3 || c - l > 3 || (e[t + a] = Lr(o + u / 8), e[n + a] = Lr(s + 3 * u / 8), e[r + a] = Lr(c - 3 * u / 8), e[i + a] = Lr(l - u / 8));
		}
	}, a = (t) => e[t] + e[t + 1] + e[t + 2] === 0;
	for (let e = 0; e < n; e++) {
		e % Or === 31 && (yield);
		let n = e * r;
		for (let e = 8; e + 1 < t; e += 8) {
			let t = n + (e - 2) * 4, r = t + 4, o = r + 4, s = o + 4;
			a(t) || a(r) || a(o) || a(s) || i(t, r, o, s);
		}
	}
	for (let e = 8; e + 1 < n; e += 8) {
		e % 128 == 0 && (yield);
		for (let n = 0; n < t; n++) {
			let t = (e - 2) * r + n * 4, o = t + r, s = o + r, c = s + r;
			a(t) || a(o) || a(s) || a(c) || i(t, o, s, c);
		}
	}
}
function* zr(e, t, n, r, i, a, o) {
	let s = a ?? yr(e, t, n, r.box, r.ref, i, void 0, vr(r.collection, r.metresPerPx), r.crs);
	return yield, yield* Mr(e, t, n, s, (o.sharpen ?? 1) * wr(r.collection, r.metresPerPx), r.jpeg), s;
}
var Br = 12;
async function Vr(e, t, n, r, i, a, o, s = {}) {
	let c = zr(e, t, n, r, i, a, s), l = performance.now();
	for (;;) {
		let e = c.next();
		if (e.done) return e.value;
		performance.now() - l >= Br && (await o(), l = performance.now());
	}
}
// api/_lib/infrared.ts
var Hr = (e) => e.startsWith("https://gibs.earthdata.nasa.gov/wms/") && /[?&]LAYERS=[^&]*_Clean_Infrared(&|$)/.test(e), Ur = [
	[
		0,
		255,
		255
	],
	[
		0,
		0,
		115
	],
	[
		0,
		255,
		0
	],
	[
		255,
		255,
		0
	],
	[
		255,
		0,
		0
	],
	[
		0,
		0,
		0
	]
], Wr = 205, Gr = 16;
function Kr(e, t, n) {
	let r = Infinity, i = 0;
	for (let a = 0; a + 1 < Ur.length; a++) {
		let [o, s, c] = Ur[a], [l, u, d] = Ur[a + 1], f = l - o, p = u - s, m = d - c, h = Math.max(0, Math.min(1, ((e - o) * f + (t - s) * p + (n - c) * m) / (f * f + p * p + m * m))), g = Math.hypot(e - o - h * f, t - s - h * p, n - c - h * m);
		g < r && (r = g, i = (a + h) / (Ur.length - 1));
	}
	return i;
}
function qr(e) {
	for (let t = 0; t < e.length; t += 4) {
		let n = e[t], r = e[t + 1], i = e[t + 2], a = Math.round(.2126 * n + .7152 * r + .0722 * i), o = a, s = Math.max(n, r, i) - Math.min(n, r, i);
		if (s > Gr) {
			let e = Math.min(1, (s - Gr) / 24);
			o = Math.round(a + (Wr + Kr(n, r, i) * 50 - a) * e);
		}
		e[t] = e[t + 1] = e[t + 2] = o;
	}
}
var Jr = (e) => e.startsWith("https://gibs.earthdata.nasa.gov/wms/") && /[?&]LAYERS=Himawari_AHI_Band3_Red_Visible[^&]*(&|$)/.test(e), Yr = /* @__PURE__ */ Uint8Array.from({ length: 256 }, (e, t) => Math.round(255 * Math.sqrt(t / 255)));
function Xr(e) {
	for (let t = 0; t < e.length; t += 4) e[t] = Yr[e[t]], e[t + 1] = Yr[e[t + 1]], e[t + 2] = Yr[e[t + 2]];
}
function Zr(e) {
	return Hr(e) ? qr : Jr(e) ? Xr : void 0;
}
// src/imagery/panSharpen.ts
var Qr = 2.2, $r = .6, ei = 1.7, ti = null, ni = 4096, ri = null;
function ii() {
	if (!ti || !ri) {
		ti = /* @__PURE__ */ new Float32Array(256);
		for (let e = 0; e < 256; e++) ti[e] = (e / 255) ** Qr;
		ri = /* @__PURE__ */ new Uint8Array(4097);
		for (let e = 0; e <= ni; e++) ri[e] = Math.round((e / ni) ** (1 / Qr) * 255);
	}
	return {
		toLin: ti,
		toEnc: ri
	};
}
function ai(e, t, n, r, i) {
	let a = e.length, o = new Float32Array(a);
	for (let n = 0; n < a; n++) o[n] = e[n] * t[n];
	let s = new Float32Array(a), c = new Float32Array(a);
	for (let e = 0; e < r; e++) {
		let r = e * n, a = r + n - 1;
		for (let e = r; e <= a; e++) {
			let n = e > r ? e - 1 : r, l = e < a ? e + 1 : a;
			i === 2 ? (s[e] = o[e] + o[l], c[e] = t[e] + t[l]) : (s[e] = o[n] + o[e] + o[l], c[e] = t[n] + t[e] + t[l]);
		}
	}
	let l = new Float32Array(a), u = new Float32Array(a);
	for (let e = 0; e < r; e++) {
		let t = (e > 0 ? e - 1 : 0) * n, a = (e < r - 1 ? e + 1 : r - 1) * n, o = e * n;
		for (let e = 0; e < n; e++) {
			let n = o + e, r = i === 2 ? s[n] + s[a + e] : s[t + e] + s[n] + s[a + e], d = i === 2 ? c[n] + c[a + e] : c[t + e] + c[n] + c[a + e];
			l[n] = d > 0 ? r / d : 0, u[n] = +(d > 0);
		}
	}
	return {
		v: l,
		w: u
	};
}
function oi(e, t, n, r) {
	let i = n * r;
	if (e.length < i * 4 || t.length < i * 4) throw Error("size");
	let { toLin: a, toEnc: o } = ii(), s = new Float32Array(i), c = new Float32Array(i), l = 0;
	for (let e = 0; e < i; e++) {
		let n = t[e * 4];
		n > 0 && (s[e] = n / 255 * (n / 255), c[e] = 1, l++);
	}
	let u = ai(s, c, n, r, 2), d = ai(u.v, u.w, n, r, 3).v;
	for (let t = 0, n = 0; t < i; t++, n += 4) {
		if (!c[t] || d[t] <= 1e-6) continue;
		let r = e[n], i = e[n + 1], l = e[n + 2];
		if (r + i + l === 0) continue;
		let u = s[t] / d[t];
		u = u < $r ? $r : u > ei ? ei : u;
		let f = a[r] * u, p = a[i] * u, m = a[l] * u, h = o[f >= 1 ? ni : f * ni + .5 | 0], g = o[p >= 1 ? ni : p * ni + .5 | 0], _ = o[m >= 1 ? ni : m * ni + .5 | 0], v = +(h + g + _ === 0);
		e[n] = h + v, e[n + 1] = g + v, e[n + 2] = _ + v;
	}
	return l / i;
}
// api/_lib/pan.ts
function si(e, t, n) {
	return `bbox=${e.map((e) => Math.round(e)).join(",")}&crs=${t}&t=${Math.round(n)}`;
}
// src/imagery/panUrl.ts
var ci = "pansharp:", li = (e) => e.startsWith(ci);
function ui(e) {
	if (!li(e)) return null;
	let [t, n, r] = e.slice(9).split("|");
	return Number.isFinite(Number(t)) && n && r ? {
		t: Number(t),
		cardUrl: n,
		fallbackUrl: r
	} : null;
}
function di(e, t) {
	let n = Ge(e);
	return !n || n.collection !== "landsat-c2-l2" || n.px !== 1e3 || n.crs === 4326 ? null : `/api/pan?${si(n.box, n.crs, t)}`;
}
// src/imagery/pixels.ts
var fi = /* @__PURE__ */ new Map();
function pi(e, t) {
	let n = `${e}x${t}`;
	if (fi.has(n)) return fi.get(n);
	let r = null;
	if (typeof OffscreenCanvas < "u") r = new OffscreenCanvas(e, t).getContext("2d", { willReadFrequently: !0 });
	else if (typeof document < "u") {
		let n = document.createElement("canvas");
		n.width = e, n.height = t, r = n.getContext("2d", { willReadFrequently: !0 });
	}
	return r && (r.globalCompositeOperation = "copy"), fi.size > 16 && fi.clear(), fi.set(n, r), r;
}
async function mi(e, t, n) {
	let r = {
		colorSpaceConversion: "none",
		premultiplyAlpha: "none"
	};
	t && !n && Object.assign(r, {
		resizeWidth: t,
		resizeHeight: t,
		resizeQuality: "low"
	});
	let i = await createImageBitmap(e, r);
	try {
		let e = n && t ? t : i.width, r = n && t ? t : i.height, a = pi(e, r);
		if (!a) throw Error("2D canvas unavailable");
		return n && t ? a.drawImage(i, n.x, n.y, n.w, n.h, 0, 0, t, t) : a.drawImage(i, 0, 0), {
			data: a.getImageData(0, 0, e, r).data,
			width: e,
			height: r
		};
	} finally {
		i.close();
	}
}
async function hi(e, t) {
	let n = kn(e), r = await fetch(n ? e.slice(0, e.indexOf("#")) : e, { signal: t }), i = r.headers.get("content-type") ?? "";
	if (!r.ok) return {
		status: r.status,
		contentType: i,
		body: await r.text().catch(() => void 0)
	};
	if (!i.startsWith("image/")) return {
		status: r.status,
		contentType: i
	};
	let a = await r.blob();
	return {
		status: r.status,
		contentType: i,
		pixels: await (n ? mi(a, 24, n) : mi(a))
	};
}
var gi = 6, _i = 16;
function vi(e) {
	let t = e.length >> 2;
	if (t === 0) return {
		noDataFraction: 1,
		meanLuma: 0
	};
	let n = 0, r = 0;
	for (let t = 0; t < e.length; t += 4) {
		let i = e[t], a = e[t + 1], o = e[t + 2];
		e[t + 3] < _i || i <= gi && a <= gi && o <= gi ? n++ : r += .2126 * i + .7152 * a + .0722 * o;
	}
	let i = t - n;
	return {
		noDataFraction: n / t,
		meanLuma: i ? r / i : 0
	};
}
async function yi(e, t) {
	let n = await fetch(e, { signal: t }), r = n.headers.get("content-type") ?? "";
	if (!n.ok || !r.startsWith("image/")) return await n.body?.cancel().catch(() => void 0), {
		status: n.status,
		contentType: r
	};
	let i = Zr(e), a = i ? await Pi(await n.blob(), i) : await n.blob(), o;
	try {
		o = vi((await mi(a, 32)).data).noDataFraction;
	} catch {
		o = void 0;
	}
	return {
		status: n.status,
		contentType: r,
		blob: a,
		noData: o
	};
}
var bi = /* @__PURE__ */ new Map(), xi = 96, Si = (e) => e >= 500 || e === 408 || e === 429;
function Ci(e) {
	let t = bi.get(e);
	if (!t) {
		let n = (async () => {
			let t = await fetch(e);
			return t.ok ? {
				status: t.status,
				mask: Rn(e, await t.arrayBuffer())
			} : {
				status: t.status,
				body: await t.text().catch(() => void 0)
			};
		})();
		t = n;
		let r = () => {
			bi.get(e) === n && bi.delete(e);
		};
		n.then((e) => {
			Si(e.status) && r();
		}, r), bi.set(e, n), bi.size > xi && bi.delete(bi.keys().next().value);
	}
	return t;
}
function wi(e, t) {
	return new Promise((n) => {
		let r = setTimeout(() => n(null), t);
		e.then((e) => {
			clearTimeout(r), n(e.mask ?? null);
		}, () => {
			clearTimeout(r), n(null);
		});
	});
}
function Ti() {
	return typeof MessageChannel > "u" ? new Promise((e) => setTimeout(e, 0)) : new Promise((e) => {
		let t = new MessageChannel();
		t.port1.onmessage = () => {
			t.port1.close(), e();
		}, t.port2.postMessage(0);
	});
}
var Ei = /* @__PURE__ */ new Map(), Di = /* @__PURE__ */ new Map(), Oi = (e) => qe(e) ? Di.get(e.key) ?? Ei.get(e.key) : Ei.get(e.key), ki = 128, Ai = 8e3, ji = .92;
function Mi(e, t) {
	if (typeof OffscreenCanvas < "u") {
		let n = new OffscreenCanvas(e, t), r = n.getContext("2d", { willReadFrequently: !0 });
		return r ? {
			canvas: n,
			ctx: r
		} : null;
	}
	if (typeof document > "u") return null;
	let n = document.createElement("canvas");
	n.width = e, n.height = t;
	let r = n.getContext("2d", { willReadFrequently: !0 });
	return r ? {
		canvas: n,
		ctx: r
	} : null;
}
function Ni(e, t) {
	if ("convertToBlob" in e.canvas) return e.canvas.convertToBlob({
		type: t,
		quality: ji
	});
	let n = e.canvas;
	return new Promise((e, r) => n.toBlob((t) => t ? e(t) : r(/* @__PURE__ */ Error("encode failed")), t, ji));
}
async function Pi(e, t) {
	let n = await createImageBitmap(e, {
		colorSpaceConversion: "none",
		premultiplyAlpha: "none"
	}), { width: r, height: i } = n, a = Mi(r, i);
	if (!a) throw n.close(), Error("2D canvas unavailable");
	a.ctx.drawImage(n, 0, 0), n.close();
	let o = a.ctx.getImageData(0, 0, r, i);
	return t(o.data), a.ctx.putImageData(o, 0, 0), Ni(a, "image/jpeg");
}
async function Fi(e, t, n = "jpeg") {
	let r = Ge(e), i = r ? Ke(r) : !1, a = r ? i ? Ci(r.maskUrl) : bi.get(r.maskUrl) : void 0;
	a?.catch(() => void 0);
	let o = await fetch(e, { signal: t }), s = o.headers.get("content-type") ?? "";
	if (!o.ok || !s.startsWith("image/")) return await o.body?.cancel().catch(() => void 0), {
		status: o.status,
		contentType: s
	};
	let c = await o.blob();
	if (!r) return bt(e) ? Ii(c, o.status, n) : {
		status: o.status,
		contentType: s,
		blob: c
	};
	let l = await createImageBitmap(c, {
		colorSpaceConversion: "none",
		premultiplyAlpha: "none"
	}), { width: u, height: d } = l, f = Mi(u, d);
	if (!f) throw l.close(), Error("2D canvas unavailable");
	f.ctx.drawImage(l, 0, 0), l.close();
	let p = f.ctx.getImageData(0, 0, u, d), m = Oi(r), h = m || !a ? null : await wi(a, Ai);
	m ??= Oi(r);
	let g = await Vr(p.data, u, d, r, h, m, Ti);
	!m && i && h && !Ei.has(r.key) && (Ei.set(r.key, g), Ei.size > ki && Ei.delete(Ei.keys().next().value)), r.px === 1e3 && n !== "png" && (Di.delete(r.key), Di.set(r.key, g), Di.size > ki && Di.delete(Di.keys().next().value)), f.ctx.putImageData(p, 0, 0);
	let _ = n === "png" ? "image/png" : "image/jpeg";
	return {
		status: o.status,
		contentType: _,
		blob: await Ni(f, _)
	};
}
async function Ii(e, t, n) {
	let r = await createImageBitmap(e, {
		colorSpaceConversion: "none",
		premultiplyAlpha: "none"
	}), { width: i, height: a } = r, o = Mi(i, a);
	if (!o) throw r.close(), Error("2D canvas unavailable");
	o.ctx.drawImage(r, 0, 0), r.close();
	let s = o.ctx.getImageData(0, 0, i, a);
	if (!Ft(s.data, i, a)) return {
		status: 404,
		contentType: ""
	};
	o.ctx.putImageData(s, 0, 0);
	let c = n === "png" ? "image/png" : "image/jpeg";
	return {
		status: t,
		contentType: c,
		blob: await Ni(o, c)
	};
}
async function Li(e, t) {
	let n = ui(e), r = n && Ge(n.cardUrl), i = n && di(n.cardUrl, n.t);
	if (!n || !r || !i) throw Error("not a pan-sharpened layer");
	let a = typeof location < "u" ? location.origin : "", o = fetch(a + i, { signal: t }), s = fetch(n.cardUrl, { signal: t });
	o.catch(() => void 0), s.catch(() => void 0);
	let c = Di.get(r.key) ?? Ei.get(r.key), l = c ? void 0 : Ci(r.maskUrl);
	l?.catch(() => void 0);
	let u = await s;
	if (!u.ok) throw await u.body?.cancel().catch(() => void 0), new Qe(u.status, n.cardUrl);
	let d = await createImageBitmap(await u.blob(), {
		colorSpaceConversion: "none",
		premultiplyAlpha: "none"
	}), { width: f, height: p } = d, m = Mi(f, p);
	if (!m) throw d.close(), Error("2D canvas unavailable");
	m.ctx.drawImage(d, 0, 0), d.close();
	let h = m.ctx.getImageData(0, 0, f, p), g = c || !l ? null : await wi(l, Ai);
	c ??= Di.get(r.key) ?? Ei.get(r.key), await Vr(h.data, f, p, r, g, c, Ti);
	let _ = await o;
	if (!_.ok || !(_.headers.get("content-type") ?? "").startsWith("image/")) throw await _.body?.cancel().catch(() => void 0), new Qe(_.status, i);
	let v = await createImageBitmap(await _.blob(), {
		colorSpaceConversion: "none",
		premultiplyAlpha: "none"
	});
	if (v.width !== f || v.height !== p) throw v.close(), Error("pan size");
	let y = Mi(f, p);
	if (!y) throw v.close(), Error("2D canvas unavailable");
	if (y.ctx.drawImage(v, 0, 0), v.close(), oi(h.data, y.ctx.getImageData(0, 0, f, p).data, f, p) < Ri) throw Error("pan mostly no data");
	return m.ctx.putImageData(h, 0, 0), {
		status: 200,
		contentType: "image/jpeg",
		blob: await Ni(m, "image/jpeg")
	};
}
var Ri = .9, zi = {
	fetch: hi,
	image: yi,
	tone: (e, t) => Fi(e, t, "jpeg"),
	"tone-png": (e, t) => Fi(e, t, "png"),
	mask: (e) => Ci(e),
	pan: Li
}, Bi, Vi = 1, Hi = /* @__PURE__ */ new Map();
function Ui(e, t) {
	if (e === "TypeError") return TypeError(t);
	let n = Error(t);
	return n.name = e, n;
}
function Wi(e) {
	Bi === e && (Bi = null);
	try {
		e.terminate();
	} catch {}
	let t = [...Hi.values()];
	Hi.clear();
	for (let e of t) zi[e.kind](e.url, e.signal).then(e.resolve, e.reject);
}
function Gi() {
	if (Bi !== void 0) return Bi;
	if (typeof Worker > "u" || typeof OffscreenCanvas > "u" || typeof createImageBitmap != "function") return Bi = null;
	try {
		let e = new Worker(new URL(
			/* @vite-ignore */
			new URL("assets/pixels.worker-kDJE5oJS.js", import.meta.url).href,
			"" + import.meta.url
		), {
			type: "module",
			name: "pixels"
		});
		e.onmessage = (e) => {
			let t = e.data, n = Hi.get(t.id);
			n && (Hi.delete(t.id), t.type === "ok" ? n.resolve(t.r) : n.reject(Ui(t.name, t.message)));
		}, e.onerror = (t) => {
			t.preventDefault?.(), Wi(e);
		}, e.onmessageerror = () => Wi(e), Bi = e;
	} catch {
		Bi = null;
	}
	return Bi;
}
function Ki(e, t) {
	return Zi("fetch", e, t);
}
function qi(e, t) {
	return Zi("image", e, t);
}
function Ji(e, t, n = "jpeg") {
	return Zi(n === "png" ? "tone-png" : "tone", e, t);
}
function Yi(e, t) {
	return Zi("pan", e, t);
}
function Xi(e, t) {
	return Zi("mask", e, t);
}
function Zi(e, t, n) {
	let r = Gi();
	return r ? new Promise((i, a) => {
		if (n?.aborted) return a(tt(n));
		let o = Vi++, s = () => {
			Hi.delete(o) && (Bi?.postMessage({
				type: "abort",
				id: o
			}), a(tt(n)));
		};
		n?.addEventListener("abort", s, { once: !0 });
		let c = () => n?.removeEventListener("abort", s);
		Hi.set(o, {
			kind: e,
			url: t,
			signal: n,
			resolve: (e) => (c(), i(e)),
			reject: (e) => (c(), a(e))
		}), r.postMessage(e === "tone-png" ? {
			type: "tone",
			id: o,
			url: t,
			fmt: "png"
		} : {
			type: e,
			id: o,
			url: t
		});
	}) : zi[e](t, n);
}
// src/imagery/image.ts
var Qi = 45e3, $i = /* @__PURE__ */ new An(96), ea = class extends Error {
	constructor(e) {
		super(`${ra(e) ? "NASA GIBS" : "EUMETSAT"} returned an empty frame for ${e.slice(0, 120)}…`), this.name = "EmptyImageError";
	}
}, ta = class extends Error {
	constructor(e) {
		super(`Image timed out after ${Math.round(e / 1e3)} s`), this.name = "ImageTimeoutError";
	}
}, na = .98, ra = (e) => e.startsWith(O), ia = (e) => ra(e) || e.startsWith("https://view.eumetsat.int/geoserver/ows");
async function aa(e, t) {
	let n = new AbortController(), r = setTimeout(() => n.abort(), t), i;
	try {
		i = await qi(e, n.signal);
	} catch (e) {
		throw n.signal.aborted ? new ta(t) : e;
	} finally {
		clearTimeout(r);
	}
	if (!i.blob) throw Error("Image failed to load");
	if ((i.noData ?? 0) >= na) throw new ea(e);
	let a = await ua(URL.createObjectURL(i.blob), t);
	return a.dataset.nodata = (i.noData ?? 0).toFixed(2), a;
}
async function oa(e, t = {}) {
	let n = t.timeoutMs ?? Qi, r = new AbortController(), i = setTimeout(() => r.abort(), n), a = () => r.abort();
	t.signal?.addEventListener("abort", a, { once: !0 });
	try {
		let n = await Ji(e, r.signal, t.fmt ?? "jpeg");
		if (!n.blob) throw new Qe(n.status, e);
		return n.blob;
	} catch (e) {
		throw r.signal.aborted && !t.signal?.aborted ? Error(`Image timed out after ${Math.round(n / 1e3)} s`) : e;
	} finally {
		clearTimeout(i), t.signal?.removeEventListener("abort", a);
	}
}
async function sa(e, t) {
	let n = await oa(e, { timeoutMs: t });
	return ua(URL.createObjectURL(n), t);
}
async function ca(e, t) {
	let n = new AbortController(), r = setTimeout(() => n.abort(), la);
	try {
		let r = await Yi(e, n.signal);
		if (r.blob) {
			let e = await ua(URL.createObjectURL(r.blob), t);
			return e.dataset.pan = "15", e;
		}
	} catch {} finally {
		clearTimeout(r);
	}
	let i = ui(e)?.fallbackUrl;
	if (!i) throw Error("Image failed to load");
	return sa(i, t);
}
var la = 6e3;
function ua(e, t) {
	return new Promise((n, r) => {
		let i = new Image();
		i.crossOrigin = "anonymous", i.decoding = "async";
		let a = !1, o = (e) => {
			a || (a = !0, clearTimeout(s), i.onload = i.onerror = null, e ? (i.src = "", r(e)) : n(i));
		}, s = setTimeout(() => o(/* @__PURE__ */ Error(`Image timed out after ${Math.round(t / 1e3)} s`)), t);
		i.onerror = () => o(/* @__PURE__ */ Error("Image failed to load")), i.onload = () => {
			typeof i.decode == "function" ? i.decode().then(() => o(), () => o()) : o();
		}, i.src = e;
	});
}
function da(e, t = {}) {
	let n = t.timeoutMs ?? Qi, r = typeof URL.createObjectURL == "function", i = () => r && ia(e) ? aa(e, n) : r && li(e) ? ca(e, n) : r && (Ye(e) || bt(e)) ? sa(e, n) : ua(e, n);
	return it(jn($i, e, async () => {
		try {
			return await i();
		} catch (e) {
			if (e instanceof ea || e instanceof ta) throw e;
			return await rt(700 + Math.random() * 500), i();
		}
	}), t.signal);
}
var fa = /* @__PURE__ */ new Map(), pa = 3e5, ma = /* @__PURE__ */ new An(256, (e) => fa.delete(e));
function ha(e, t) {
	let n = fa.get(e);
	return n !== void 0 && Date.now() - n > pa && (fa.delete(e), ma.delete(e)), it(jn(ma, e, async () => {
		let t = await ot(async (t) => {
			let n = await Ki(e, t);
			if (n.status === 404 && Dn(e)) return {
				noDataFraction: 1,
				meanLuma: 0,
				width: 0,
				height: 0
			};
			if (n.status < 200 || n.status >= 300) throw new Qe(n.status, e);
			if (!n.pixels) return {
				noDataFraction: 1,
				meanLuma: 0,
				width: 0,
				height: 0
			};
			let { data: r, width: i, height: a } = n.pixels;
			return {
				...vi(r),
				width: i,
				height: a
			};
		}, {
			timeoutMs: 15e3,
			retries: 1,
			retryTimeouts: !1,
			label: e
		});
		return t.noDataFraction > .5 && fa.set(e, Date.now()), t;
	}), t);
}
// src/imagery/gibs.ts
var ga = {
	"gibs-viirs-noaa20": {
		collection: "gibs-viirs-noaa20",
		layer: "VIIRS_NOAA20_CorrectedReflectance_TrueColor",
		platform: "noaa-20",
		gsdM: 375,
		kind: "daily",
		tileMatrixSet: "250m"
	},
	"gibs-viirs-noaa21": {
		collection: "gibs-viirs-noaa21",
		layer: "VIIRS_NOAA21_CorrectedReflectance_TrueColor",
		platform: "noaa-21",
		gsdM: 375,
		kind: "daily",
		tileMatrixSet: "250m"
	},
	"gibs-viirs-snpp": {
		collection: "gibs-viirs-snpp",
		layer: "VIIRS_SNPP_CorrectedReflectance_TrueColor",
		platform: "suomi-npp",
		gsdM: 375,
		kind: "daily",
		tileMatrixSet: "250m"
	},
	"gibs-modis-terra": {
		collection: "gibs-modis-terra",
		layer: "MODIS_Terra_CorrectedReflectance_TrueColor",
		platform: "terra",
		gsdM: 250,
		kind: "daily",
		tileMatrixSet: "250m"
	},
	"gibs-modis-aqua": {
		collection: "gibs-modis-aqua",
		layer: "MODIS_Aqua_CorrectedReflectance_TrueColor",
		platform: "aqua",
		gsdM: 250,
		kind: "daily",
		tileMatrixSet: "250m"
	},
	"gibs-goes-east": {
		collection: "gibs-goes-east",
		layer: "GOES-East_ABI_GeoColor",
		platform: "goes-east",
		gsdM: 1e3,
		kind: "subdaily",
		cadenceMin: 10,
		tileMatrixSet: "2km"
	},
	"gibs-goes-west": {
		collection: "gibs-goes-west",
		layer: "GOES-West_ABI_GeoColor",
		platform: "goes-west",
		gsdM: 1e3,
		kind: "subdaily",
		cadenceMin: 10,
		tileMatrixSet: "2km"
	},
	"gibs-himawari": {
		collection: "gibs-himawari",
		layer: "Himawari_AHI_Band3_Red_Visible_1km",
		platform: "himawari",
		gsdM: 1e3,
		kind: "subdaily",
		cadenceMin: 10,
		visibleOnly: !0,
		tileMatrixSet: "1km"
	}
}, _a = {
	layer: "Himawari_AHI_Band13_Clean_Infrared",
	tileMatrixSet: "2km"
}, va = {
	43013: "gibs-viirs-noaa20",
	54234: "gibs-viirs-noaa21",
	37849: "gibs-viirs-snpp",
	25994: "gibs-modis-terra",
	27424: "gibs-modis-aqua"
}, ya = (e) => String(e).padStart(2, "0");
function ba(e) {
	let t = new Date(e);
	return `${t.getUTCFullYear()}-${ya(t.getUTCMonth() + 1)}-${ya(t.getUTCDate())}`;
}
function xa(e) {
	return (/* @__PURE__ */ new Date(Math.floor(e / 1e3) * 1e3)).toISOString().replace(/\.\d{3}Z$/, "Z");
}
var Sa = 6e5, Ca = 42e5;
function wa(e, t = Date.now()) {
	return Math.floor(Math.min(e, t - Ca) / Sa) * Sa;
}
function Ta(e) {
	let t = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(e.trim());
	if (!t || e.trim() === "P" || e.trim() === "PT") return;
	let [, n, r, i, a] = t.map((e) => Number(e ?? 0)), o = ((n * 24 + r) * 60 + i) * 6e4 + a * 1e3;
	return o > 0 ? o : void 0;
}
function Ea(e, t, n, r = 2e3) {
	let i = [];
	for (let a of e.split(",")) {
		let [e, o, s] = a.trim().split("/"), c = Date.parse(e ?? "");
		if (!Number.isFinite(c)) continue;
		if (o === void 0) {
			c >= t && c <= n && i.push(c);
			continue;
		}
		let l = Date.parse(o), u = s ? Ta(s) : void 0;
		if (!Number.isFinite(l) || !u) continue;
		let d = c + Math.max(0, Math.ceil((t - c) / u)) * u;
		for (; d <= Math.min(l, n) && i.length < r; d += u) i.push(d);
	}
	return [...new Set(i)].sort((e, t) => e - t);
}
var Da = 216e5, Oa = 3e5, ka = /* @__PURE__ */ new Map(), Aa = /* @__PURE__ */ new An(16);
async function ja(e, { signal: t, now: n = Date.now() } = {}) {
	let r = ka.get(e.layer);
	if (r && Math.abs(n - r.at) < Oa) return r.frames;
	let i = Math.ceil(n / 36e5) * 36e5, a = i - Da - 36e5, o = N(e.layer, e.tileMatrixSet, xa(a), xa(i)), s = Aa.get(o);
	return s || (s = ot(async (t) => {
		let n = await fetch(o, { signal: t }), r = await n.text(), s = /<Domain>([^<]+)<\/Domain>/.exec(r)?.[1];
		if (!n.ok || !s) throw Error(`GIBS has no time domain for ${e.layer}`);
		return Ea(s, a, i).reverse();
	}, {
		timeoutMs: 6e3,
		retries: 1,
		label: o
	}), Aa.set(o, s), s.then((t) => ka.set(e.layer, {
		at: n,
		frames: t
	}), () => Aa.delete(o))), it(s, t);
}
var Ma = 24, Na = 30, Pa = 12, Fa = .5;
function Ia(e, t, n) {
	return On(e, t, n, Na, 60 / Ma) ?? M(e, t, n, {
		halfSizeKm: Na,
		px: Ma
	});
}
function La(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let r of t) {
		let t = va[r.norad];
		if (!t || !r.inSwath || !(r.sunElevationDeg >= 5)) continue;
		let i = `${t}@${w(r.tClosest, e.lon)}`, a = n.get(i);
		(!a || r.groundDistanceKm < a.groundDistanceKm) && n.set(i, r);
	}
	let r = [];
	for (let t of n.values()) {
		let n = ga[va[t.norad]], i = w(t.tClosest, e.lon), a = `${n.layer}@${i}`;
		r.push({
			id: a,
			provider: "gibs",
			collection: n.collection,
			itemId: a,
			platform: n.platform,
			norad: t.norad,
			datetime: t.tClosest,
			gsdM: n.gsdM,
			sunElevationDeg: t.sunElevationDeg,
			cropUrl: (t) => M(n.layer, i, e, t),
			previewUrl: M(n.layer, i, e, {
				halfSizeKm: 600,
				px: 1024
			}),
			sourceUrl: ne(n.layer, i, e)
		});
	}
	return r.sort((e, t) => t.datetime - e.datetime);
}
async function Ra(e, t, n) {
	let [r, i] = e.itemId.split("@");
	if (e.provider !== "gibs" || !r || !i) return !1;
	try {
		return (await ha(Ia(r, i, t), n)).noDataFraction <= Fa;
	} catch {
		return nt(n), !1;
	}
}
async function za(e, t, n) {
	nt(n);
	let r = La(e, t), i = await lt(r, Pa, (t) => Ra(t, e, n));
	return nt(n), r.filter((e, t) => i[t]);
}
function Ba(e, t, n, r, i) {
	let a = n - Ca, o = (r && r.length ? r.filter((e) => e <= a) : Array.from({ length: i }, (e, t) => wa(n, n) - t * Sa)).slice(0, i);
	return e.visibleOnly ? o.filter((n) => b(t.lat, t.lon, n) > (e.minSunDeg ?? 0)) : o;
}
async function Va(e, t, n, { signal: r, now: i = Date.now(), maxSteps: a = 12 } = {}) {
	if (e.visibleOnly && Ba(e, t, i, null, a).length === 0) return null;
	let o = null;
	try {
		o = await ja(e, {
			signal: r,
			now: i
		});
	} catch (e) {
		if (et(e) || r?.aborted) throw e;
	}
	for (let s of Ba(e, t, i, o, a)) {
		nt(r);
		let i = M(e.layer, xa(s), t, n);
		try {
			return await da(i, { signal: r }), {
				url: i,
				time: s
			};
		} catch {
			nt(r);
		}
	}
	return null;
}
// src/imagery/eumetsat.ts
function Ha(e, t, n, r) {
	let { halfSizeKm: i, px: a } = j(r), [o, s, c, l] = C(n.lat, n.lon, i), u = (e) => Math.max(-90, Math.min(90, e)).toFixed(5), d = (e) => e.toFixed(5);
	return `${A}?service=WMS&version=1.3.0&request=GetMap&layers=${encodeURIComponent(e)}&styles=&format=image%2Fjpeg&crs=EPSG:4326&bbox=${u(s)},${d(o)},${u(l)},${d(c)}&width=${a}&height=${a}&bgcolor=0x000000&time=${encodeURIComponent(xa(t))}`;
}
function Ua(e) {
	let [t, n] = e.split(":");
	return `${te}/${encodeURIComponent(t)}/${encodeURIComponent(n ?? "")}/ows?service=WMS&version=1.3.0&request=GetCapabilities`;
}
function Wa(e) {
	return `${te}/gwc/service/wmts?service=WMTS&version=1.0.0&request=DescribeDomains&layer=${encodeURIComponent(e)}&tileMatrixSet=EPSG%3A4326&domains=time`;
}
var Ga = 108e5, Ka = 3e5;
function qa(e, t, n) {
	let r = /<Dimension\b[^>]*\bname="time"[^>]*>([^<]+)<\/Dimension>/.exec(e)?.[1];
	return r ? Ea(r, t, n).reverse() : [];
}
function Ja(e, t, n, r) {
	let i = Date.parse(/<Domain>[^<]*--([^<]+)<\/Domain>/.exec(e)?.[1] ?? ""), a = [];
	if (!Number.isFinite(i) || !(t > 0)) return a;
	for (let e = i; e >= n && a.length < 64; e -= t) e <= r && a.push(e);
	return a;
}
var Ya = /* @__PURE__ */ new Map();
async function Xa(e, t, n, r) {
	return ot(async (t) => {
		let i = await fetch(e, { signal: t }), a = i.ok ? n(await i.text()) : [];
		if (!a.length) throw Error(`EUMETSAT lists no frames for ${r}`);
		return a;
	}, {
		timeoutMs: 6e3,
		retries: t,
		label: e
	});
}
function Za(e, { signal: t, now: n = Date.now() } = {}) {
	let { layer: r } = e, i = Ya.get(r);
	if (!i || Math.abs(n - i.at) >= Ka) {
		let t = n - Ga, a = Xa(Ua(r), 0, (e) => qa(e, t, n), r).catch(() => Xa(Wa(r), 1, (r) => Ja(r, e.stepMin * 6e4, t, n), r)), o = i = {
			at: n,
			frames: a
		};
		Ya.set(r, o), a.catch(() => {
			Ya.get(r) === o && Ya.delete(r);
		});
	}
	return it(i.frames, t);
}
function Qa(e, t, n, r = 4) {
	let i = n.slice(0, r), a = e.minSunDeg;
	return a === void 0 ? i : i.filter((e) => b(t.lat, t.lon, e) >= a);
}
var $a = 36e5;
function eo(e, t, n, r) {
	let i = e.minSunDeg;
	if (i === void 0) return !0;
	let a = n - $a - r * e.stepMin * 6e4;
	for (let e = n; e >= a; e -= 3e5) if (b(t.lat, t.lon, e) >= i) return !0;
	return !1;
}
async function to(e, t, n, { signal: r, now: i = Date.now(), maxSteps: a = 4 } = {}) {
	if (!eo(e, t, i, a)) return null;
	let o;
	try {
		o = await Za(e, {
			signal: r,
			now: i
		});
	} catch (e) {
		if (et(e) || r?.aborted) throw e;
		return null;
	}
	for (let i of Qa(e, t, o, a)) {
		nt(r);
		let a = Ha(e.layer, i, t, n);
		try {
			return await da(a, { signal: r }), {
				url: a,
				time: i
			};
		} catch {
			nt(r);
		}
	}
	return null;
}
// src/imagery/geoFrames.ts
var no = 6, ro = 3, io = {
	"goes-east": {
		sensor: "ABI",
		layers: [{
			via: "gibs",
			layer: ga["gibs-goes-east"],
			band: "colour",
			gridKm: 2
		}]
	},
	"goes-west": {
		sensor: "ABI",
		layers: [{
			via: "gibs",
			layer: ga["gibs-goes-west"],
			band: "colour",
			gridKm: 2
		}]
	},
	himawari: {
		sensor: "AHI",
		layers: [{
			via: "gibs",
			layer: {
				...ga["gibs-himawari"],
				minSunDeg: no
			},
			band: "visible",
			gridKm: 1
		}, {
			via: "gibs",
			layer: _a,
			band: "infrared",
			gridKm: 2
		}]
	},
	"meteosat-0deg": {
		sensor: "FCI",
		layers: [{
			via: "eumetsat",
			layer: {
				layer: "mtg_fd:rgb_geocolour",
				stepMin: 10
			},
			band: "colour",
			gridKm: 2
		}]
	},
	"meteosat-iodc": {
		sensor: "SEVIRI",
		layers: [{
			via: "eumetsat",
			layer: {
				layer: "msg_iodc:rgb_naturalenhncd",
				stepMin: 15,
				minSunDeg: no
			},
			band: "colour",
			gridKm: 5
		}, {
			via: "eumetsat",
			layer: {
				layer: "msg_iodc:ir108",
				stepMin: 15
			},
			band: "infrared",
			gridKm: 5
		}]
	}
}, ao = {
	"goes-east": "gibs-goes-east",
	"goes-west": "gibs-goes-west",
	himawari: "gibs-himawari",
	"meteosat-0deg": "eumetsat-meteosat-0deg",
	"meteosat-iodc": "eumetsat-meteosat-iodc"
};
function oo(e) {
	return Object.keys(ao).find((t) => ao[t] === e);
}
function so(e, t, n, r, i) {
	let a = t.layer.layer, o = `${a}@${xa(n)}`, { lat: s, lon: c } = r;
	return {
		id: o,
		provider: t.via,
		collection: ao[e],
		itemId: o,
		platform: e,
		norad: i,
		datetime: n,
		gsdM: t.gridKm * 1e3,
		band: t.band,
		cropUrl: (e) => t.via === "gibs" ? M(a, xa(n), {
			lat: s,
			lon: c
		}, e) : Ha(a, n, {
			lat: s,
			lon: c
		}, e),
		sourceUrl: t.via === "gibs" ? ne(a, ba(n), {
			lat: s,
			lon: c
		}) : `${te.replace("/geoserver", "")}/productviewer?v=${encodeURIComponent(a)}`
	};
}
function co(e, t, n, r) {
	let i = io[e].layers.find((e) => e.layer.layer === t.layer);
	return i && so(e, i, t.time, n, r);
}
function lo(e, t, n, r) {
	let i = oo(e), [a, o] = t.split("@"), s = Date.parse(o ?? "");
	if (i && Number.isFinite(s)) return co(i, {
		time: s,
		layer: a
	}, n, r);
}
async function uo(e, t, n, r = {}) {
	let { layers: i } = io[e];
	for (let [e, a] of i.entries()) {
		let o = e < i.length - 1 ? {
			...r,
			maxSteps: ro
		} : r, s = a.via === "gibs" ? await Va(a.layer, t, n, o) : await to(a.layer, t, n, o);
		if (s) {
			let e = await da(s.url).catch(() => null);
			return {
				...s,
				band: a.band,
				gridKm: a.gridKm,
				empty: Number(e?.dataset.nodata) || 0,
				layer: a.layer.layer,
				via: a.via
			};
		}
	}
	return null;
}
// src/imagery/cloud.ts
function fo(e) {
	if (e == null || !Number.isFinite(e)) return "unknown";
	switch (Math.round(e)) {
		case 8:
		case 9: return "cloud";
		case 10: return "cirrus";
		case 3: return "shadow";
		case 0:
		case 1: return "unknown";
		default: return "clear";
	}
}
function po(e) {
	if (e == null || !Number.isFinite(e)) return "unknown";
	let t = Math.round(e);
	return t & 1 ? "unknown" : t & 14 ? "cloud" : t & 16 ? "shadow" : "clear";
}
var mo = .5;
function ho(e) {
	return _o(e, fo);
}
function go(e) {
	return _o(e, po);
}
function _o(e, t) {
	let n = {
		clear: 0,
		cirrus: 0,
		cloud: 0,
		shadow: 0
	}, r = 0;
	for (let i = 0; i < e.length; i++) {
		let a = t(e[i]);
		a !== "unknown" && (r++, n[a]++);
	}
	if (r === 0 || r < e.length * mo) return "unknown";
	let i = [
		"cloud",
		"shadow",
		"cirrus",
		"clear"
	], a = "cloud";
	for (let e of i) n[e] > n[a] && (a = e);
	return a;
}
function vo(e, t) {
	return e.provider === "gibs" ? null : e.collection === "sentinel-2-l2a" ? qt(e.itemId) ? { url: Xe("sentinel-2-l2a", e.itemId, t) } : null : e.collection === "landsat-c2-l2" ? { url: Xe("landsat-c2-l2", e.itemId, t) } : null;
}
var yo = .5;
function bo(e, t) {
	let [n, r] = Bn(e, t.lat, t.lon), [i, a, o, s] = C(r, n, yo), c = [], l = (e.box[2] - e.box[0]) / e.w, u = (e.box[3] - e.box[1]) / e.h;
	for (let t = 0; t < e.h; t++) {
		let n = e.box[3] - (t + .5) * u;
		if (!(n < a || n > s)) for (let n = 0; n < e.w; n++) {
			let r = e.box[0] + (n + .5) * l;
			r >= i && r <= o && c.push(e.cls[t * e.w + n] === 0 ? NaN : e.raw[t * e.w + n]);
		}
	}
	if (!c.length) {
		let n = Vn(e, t.lat, t.lon);
		if (n < 0 || e.cls[n] === 0) return "unknown";
		c.push(e.raw[n]);
	}
	return e.collection === "sentinel-2-l2a" ? ho(c) : go(c);
}
var xo = /* @__PURE__ */ new An(512), So = { spot: "unknown" };
async function Co(e, t, n) {
	nt(n);
	let r = vo(e, t);
	if (!r) return So;
	let i = `${r.url}|${t.lat.toFixed(5)},${t.lon.toFixed(5)}`, a = jn(xo, i, () => ot(async (e) => {
		let n = await Xi(r.url, e);
		if (n.status < 200 || n.status >= 300 || !n.mask) throw new Qe(n.status, r.url, n.body);
		return {
			spot: bo(n.mask, t),
			clearFraction: Wn(n.mask)
		};
	}, {
		timeoutMs: 1e4,
		retries: 1,
		label: r.url
	}));
	try {
		return await it(a, n);
	} catch (e) {
		if (et(e) || n?.aborted) throw e;
		return e instanceof Qe && e.status >= 400 && e.status < 500 && xo.set(i, Promise.resolve(So)), So;
	}
}
async function wo(e, t, n) {
	return (await Co(e, t, n)).spot;
}
new Set("10111214151718191a1d1r2023242526282d31353b3d3r4a535d6d6t7j7laaabacadaeafagahaiajakalamanaoapaqarasatauavawaxayazb2babbbcbdbebhbibjblbmbnbobpbrbsbtbubwbybzc3c4cacccdcecfchcicjckclcmcncocpcrcsctcucvcwcyczdadbdcdddedhdidjdldmdndodpdrdsdudvdwdydzeaebecedeeefegeheiejekelemeneoepeqereseteuevewexeyezfafcfdfefffgfhfifjflfmfnfofpfrftfufwfygagbgdgegfggghgigjgkglgmgngogqgrgsgugvgwgygzh4h5hahbhdhehhhihjhkhlhmhnhohphrhshthuhvhwhyiaibicidieifigihiiijikiliminioipiqirisitiuiviwixiyizjajbjcjdjejfjgjhjijjjljmjnjojpjrjsjtjujvjwjyk2kakbkckdkekfkgkhkikjkkklkmknkokpkqkrksktkukvkwkxkykzlalclelflglhliljlllmlnlolplqlsltlulvlwlymambmcmdmemfmgmhmimjmkmlmmmnmompmqmrmsmtmumvmwmymznanbncndnengnhninjnknlnnnonpnqnrnsntnunwnynzo2oaobocodoeofogohoiojokolomonooopoqorosotouovowoxoyozpapbpcpepfpgphpipjplpnpoppprpsptpupwpyqaqeqiqoqqqrquqvrarcrdrergrhrirjrkrlrmrnrorrrsrtrurwryrzs2sasbscsdsesfsgshsisjskslsmsnsospsqsrssstsusvswsysztatbtctetgthtitjtktltmtntotptqtrtstttutvtwtxtytzuaubucudueufuguhuiujukulumunuoupuqurusutuuuvuwuxuyuzvavcvevfvivkvlvnvovrvsvtvuvvvwvxvyvzwawbwcwdwewfwgwhwiwjwkwlwmwnwowpwqwrwswtwuwvwwwxwywzxaxbxcxexgxhxixkxlxmxoxpxtxuxyyaybycydyeyfygyhyiylymynyoypyqyrysytyuyvywyxyyyzzazbzdzezgzhzizlzmznzozrzszuzvzwzy".match(/../g) ?? []), new Set("al,am,an,ar,as,ba,bal,ban,bar,be,bel,ber,bi,bl,bo,br,bu,ca,cam,can,car,cas,cast,ce,cer,cerr,cerro,ch,cha,che,chi,ci,cl,co,col,cor,cr,cu,da,de,di,do,du,el,es,fa,fe,fo,for,fr,ga,ge,go,gr,gra,gre,gu,ha,he,hi,ho,hu,in,is,ja,ji,jo,ka,kar,ke,kh,ki,ko,kr,ku,la,lac,lak,lake,lan,le,li,lo,lu,ma,mal,man,mar,me,mi,mo,mon,mont,mor,mou,moun,mount,mu,na,ne,ni,no,nor,nov,or,pa,pal,par,pe,pi,pl,po,pr,pu,qu,ra,re,ri,ro,ru,sa,sai,sain,saint,sal,san,sanj,sant,santa,sc,sch,se,sh,sha,si,so,st,sta,su,ta,te,th,ti,to,tr,tu,va,val,ve,vi,vil,vill,villa,wa,we,wes,wi,wo,xi,ya,za,zh".split(",")), new Set("1209,1210,1402,1403,1500,1528,1529,1599,1600,1715,1892,1893,1906,1907,1908,1909,1910,1911,1912,1913,1979,1980,1981,1982,1983,1984,1985,1986,2051,2052,2053,2054,2055".split(",").filter(Boolean).map(Number));
// node_modules/@photostructure/tz-lookup/tz.js
var To = /* @__PURE__ */ o(((e, t) => {
	function n(e, t) {
		var n = "XKXJXJXIXIXSXSXRXRXQXQXP##U;U;U;#$UZUZUZUZUZXHXGXGXTXTXXXXXYXYXZXZY#Y#Y$Y$Y%Y%Y&Y&Y'Y'XUXUXVXVXWXKXJXJXIXIXSXSU:U$#%#&V,#'U;#(#)UZUZUZUZUZ#*UZXGXGVPVPVP#+YIYIYIYI#,W@W@W@W@W@W@Y&X/X/X/X/X/XVXWVTUV#-T,T,#.U:U:#/#0#1#2#3U;U;U;UZUZUZUZ#4#5YJYJXGYJ#6#7#8YIYIYI#9X1#:W@W@W@#;X/X/#<#=#>#?#@VTVT#A#B#CT,T,#D#E#F#G#H#IV,#J#K#L#MUZUZUZUZX9X9#N#OYJ#P#Q#R#SYI#T#U#VX1#W#XW@W@#Y#ZX/$#$$$%$&$'$($)$*$+$,T,T,$-$.$/U$$0$1$2$3$4$5$6$7UZUZXLXLXH$8$9$:$;$<$=$>YI$?$@$A$B$C$D$E$FW6$G$H$I$J$K$LW;$MT+T+T+XJXIXIXSVB$N$O$P$Q$R$S$T$U$V$WV7XMXLXLXHY6$X$Y$Z%#%$%%%&%'%(%)VR%*%+%,%-%.%/%0%1%2%3%4W;XVT+XKXJXJXIXIXSXSUC%5%6%7TN%8%9%:%;U0XMXMX3X3XH%<%=%>%?%@%A%B%C%D%E%F%G%HX+%I%J%KWX%L%M%N%OXUXVXVXWXKXJXJXIXIXSXSUC%P%Q%RTN%SUUXOX4XNXMXMXLX3X8%T%US2%V%W%X%Y%Z&#&$&%&&&'WXWXWXWXWX&(&)X(XUXUXVXVXW&*ZCZCXIXIXSXSXR&+&,&-&.&/&0UTXNXNXMXMXLXL&1&2&3S2&4T(&5&6WT&7&8&9&:&;&<&=&>&?&@&AX(X(XUX(XVXVXWXKZCZCZCXIXSXSXRUK&B&C&D&E&F&G&HXNXMXMXLX6&I&J&K&L&M&N&O&P&Q&R&SWHW?W?&T&U&V&W&X&YY'X(ZUXUXVZYXWXKXJXJXIXIXSXSXRXRXQXQ&Z'#'$'%'&''XMXMXLX6'(')'*'+','-'.'/'0'1VQXZW?'2Y$'3'4'5'6WGZPZ9'7'8ZH'9XWXKXJZEZEXIXSXSXRXRXQXQZ?':';'<'='>'?XMXLUWXH'@'A'B'C'D'E'F'G'HXZXZZ1W*Y$'I'J'K'L'M'NW8Z9'O'P'QZWZDZDXJZEXIXSXSXRXRXQXQZ?'R'S'TUG'U'V'W'XXLXHXHXGSS'Y'Z(#($(%XYZ0XZ(&Y#Y$Y$W7('((()W8(*ZS(+ZA(,(-(.(/ZTZE(0(1XSXRXRXQXQXPUBUB(2(3(4(5(6(7XLXHX;XGXGSP(8(9(:(;(<Z2XZY#Y#Y$Z-Y%(=(>(?(@(A(B(CZA(D(E(FZLZT(GZV(HXSXRXRXQXQXPXPUB(I(J(K(L(MXLUWXHXHX;XG(N(O(P(Q(RZ*(SZ2Y#Y#Y$Y$Y%Y%XEXE(T(UX>X>ZN(VZ=(WXJXJZVZVZ@(XZQXRZ:XQXPXPV1(Y(Z)#V3V3XLXLXHXHXGXGT*)$)%)&Z*Z*XZXZY#Y#Y$Y$Y%Y%XEXE)')()))*XV)+XWZ6XJXJXIXIXSXSXRXRXQXQXPXPV1),)-).V3XMXLXLXHX;XGXGXTSG)/SGXYXYXZXZY#Y#Y$Y$Y%Y%XE)0)1)2)3XFXCZ6Z6Z8XJXJXIXIXSXSXRXRXQXQXPXPTR)4)5T0XMXMXLXLXHX;XGXGXTXTXXXXXYXYXZXZY#Z/Y$Y$Y%Y%Y&Y&Y')6)7XDXVZ6Z6XKXJXJXIXIXSXSXRXRXQXQXPXP)8)9):X<XMXMXLXLXHXHXGXGXTXTXXSGSGZ/Z/XZZ/Y#Y$Y$Y%Y%Y&Y&Y'Y'XUXUXVZ6Z6XKXJXJXIXIXSXSXRXRXQXQXPXPV+);)<X<XMX:X:X:XHXHXGXGXTXTXXXXXYXYXZXZY#Y#Y$Y$Y%Y%Y&Y&Y'Y'XUXUVIZ6XWXKXJXJXIXIXSXSXRXRXQXQXPXPVLVL)=)>T;T;XLXLXHXHXGXGXTXTVMVMVMVM)?VJVJVG)@VOVFVFVFVHVHVHVHVH)AVKXWXKXJXJXIXIXSXSXRXRXQXQXPXPVLVLT;T;T;T;)BVL)CY()DVNVNVN)EVMVMVM)FVJVJ)G)HVO)I)J)K)L)M)N)O)P)QVKVKVKVKVKVKXIXSXSXRXRXQXQXPXPVLVLT;T;T;T;)RVL)SY()TVNVNVN)UVMVMVM)VVJVJ)W)XVOVOVO)YXEXEXEXEXE)ZVKVKVKVKVKVKVKVKVKVKVKVKVKVKVK*#*$*%*&*'*(*)***+*,*-*.*/*0*1*2*3*4*5*6*7*8*9*:*;*<*=*>*?*@*A*B*CVKVKXPXPV,*CXNXNU;UZ*BTH*CTHTHV,THV,V,*BV,*CU;*CV>V>*CUZ*DUZUZUZTV*DVP*DVPXXY#W@YIY#XJT,UVT,XSXS*B*CU$U$*C*D*DTH*ETHTH*ETHTH*EV,THTHV,*E*F*GUZ*GUZ*HUZUZV4XHVPVPYJ*GYJYJ*G*HXXXX*HYIYIX1YI*H*HW@X1*IW@*I*J*KX/*KX/*L*L*MX.*N*N*OWZWZ*OWZWZWZXVXVWZ*OVTVTVTUV*NUVUVUVUVT,UVT,*MVC*NVC*NU:VC*OU:U:*OU:U$*OU$U$*O*PU$U$THV,U$V,V,*OV,*P*PU;*Q*RU;U;*RU;U;U;U;*RX9XHXHX7XGXGX7YBYJ*PYJ*QYWYWYW*Q*QY9Y9*R*RYIYIYIYIYI*RYIYIYI*R*S*S*TX1X1X1X1*T*U*UW@*VW@*VX/*W*XX/X/*XX/X/*XX/*Y*Y*ZW>+#+#WZ+$WE+$+%WEWE+%+&WE+'VTVTW;+'VTVT+'VTXKUVXKT+UVUVT+UV+%T,UVT,VE+%XSV5+%VB+&VB+&+'VB+(+(V.+)+*V.VD+*VDVD+*VDVDV,+*V@++U;++U;V@V@++V@V@++U*+,U*XNXNU*V7YBYBXH++YBYB++YBXGYJYB+++++,+-+.YW+.+/+0+0+1+2+3YIYI+3YI+3+4+5+6+6X1+7X1X1X1+7+8X1+8+9+:+:+;+<+=+=+>+?+@W@W@W@+@+@+AW6W6W6+A+BW)X/X/+B+CX/+CX/X.X.X.X.+CX.WEWUXUWE+BXUW;W;W;W;T+VB+A+B+C+C+D+E+F+F+GTYTYV.VD+G+HVDVDTN+HV@V@+H+I+IV@V@V@V@V@V@+IV@+I+J+K+KV7+LV7+L+MYKYK+M+NYK+O+O+P+Q+R+R+S+T+U+U+V+W+X+X+Y+Z,#,#,$,%,&,&,',(,),),*,+VV,+,,,-,.VR,.VRVR,.,/,0X+,0,1,2X*X*,2X*X*,2,3X*X*,3,4X*,5,5,6WXWX,6,7,8,9X.,9X.,:WUXUWUWEWZ,9,:WZ,:,;UC,<,<TYTYTYTY,<TYTN,<,=,>,?,?,@UUUU,@UUUUUU,@U0XNXNXH,@XHY@,@,A,BYD,B,CYDYD,C,DYOYO,D,EYO,F,F,G,H,I,I,JY;Y;,J,KY;,L,L,M,N,O,O,PVW,Q,Q,R,S,T,T,U,V,W,W,X,YX+X+,YWXWX,Y,ZWXWX,Z-#WXWXWX-#WX-$-$X.-%Y'X.X(X(X(-$WEXUXUUC-$-%-&-&TY-'-(-(TN-)TNTN-)TN-*XH-*XHS<-*-+S<-,-,---.-/YOY,T(T(Y,-.-/S;-/-0S;-1-1-2-3-4-4X&-5X&X&-5X&X&-5-6-7-8-8-9-:-;-;-<-=->WXWWWXWW-=X(X(X(ZJZCXKZCV?-<XRUK-<-=UK->->-?-@-ATNTN-AUMTN-AUM-B-BUT-CUTXHX5XHSC-B-C-DT$S2S2-D-E-ET(-F-G-GS;-HS;S;-HS;-I-I-JWT-KX&-K-L-M-MW<-NW<-N-O-PW?W?-PW?W?-P-QW?-R-R-S-T-U-UWX-V-WWXWX-WWXWXWX-W-XWXX(-XX(UK-XUKXQ-X-YUNUNUNUMUN-Y-YU1-ZV=-Z.#.$.%.%V2.&.'VAT-.'.(XH.(X6.).)T$.*T$.*S4.+S4.+.,S4T#.,T#T#T#SZ.,SZSZ.,SJ.-SJ.-SJSJ....WT./.0WTWT.0VQ.0WH.1WHW?.1W?Y$.1X0X0X0.1.2.3.4.4WX.5.6.6X#WX.7.7Y&WGY&XP.7XPXP.7UFXPTQTFTFV$.7TF.7.8TKTK.8TK.9TAXNU/XNXH.8XHS7.8.9.:.;.;.<.=.>.>.?.@SM.@.ASM.B.BSZ.C.DSJSJ.D.ESJ.E.FS1.F.GS1.H.H.ISWSWW?W?W?.IW?.IW?.J.J.K.L.M.MW3W3W3.M.N.OWGZBXUZ9Z9XUXUZ9ZRZHZH.MZHTQV$Z?XP.LTF.MTFTF.MTF.NTK.N.O.P.P.Q.R.S.SXMTBTBSD.SXHXHS/.SXGXG.SSMXGT'.SSB.T.U.U.V.WSL.W.X.Y.ZSH.Z/#/$S1/$SYSW/$SWSWXYW?W7Y$W7/#/$W7/%W7W7W7/%/%/&/'WFWG/'WF/(ZPZP/(/)Z9ZRXUZRZRZFXVXVZHZHXVZWZ?UBXPUB/%/&/'UB/'/(/)/*/*V0/+V0TB/+TB/,U(U(U(/,U(UWU(UWSN/+SN/,/,/-/./////0SQ/1/1/2S@S@/2/3/4XYY#Z1Z+Z+W7WOW7/3/3WF/4WFWFW8WF/4W8/4W8/5ZSZ7ZS/5ZKZWXVXVZWZWZ>Z>Z>Z<ZZ/3/3ZT/4/5ZEXIZVZVZIZIZVZV/3/4UB/5/5/6UA/7/7/8TTTT/8/9/:/;/;/<T?/=/=XLT?XLSP/=SPSPSQ/=/>/?/?S@/@/AS@Z.ST/AZ0Z0/AZ*/AW7Y%Y%/AWFY&Y&WF/AXEXE/A/B/CX@/C/DX@X>/DZSX>XUZS/DZSZSZAXV/DZAXWZ>XWZ=Z=ZX/CZXZVZV/CZVZVZVZV/CUB/CUB/DUAUA/D/E/E/F/G/H/HV3/IV3V3/IV3V3XT/IXTT*/ISPT*/J/J/KSE/L/L/M/NSTSTZ*XYZ*XZZ2Z4Z2/LX@/MX@X@X>/MX>Z;Z;ZN/MZXZXZ6XKZ@ZQXSXSXOV1V1/K/K/L/MT2/M/N/O/PT*/P/Q/R/R/SSG/T/TST/UXX/UX@/VX=X@X>X=/VX>X>/V/WX>X>/W/XZNZNZMXVV1/WV1/X/X/Y/Z0#0#0$0%0&SG0&SGSGXE0&XEXE0&X=Y'X=X=0&X=0'XFXF0'0(0(0)0*T1T70*0+T7Y'0+Y'Y'0+0,XBXBXOTRXOV+0+0,0-0.0.XNT6X<V+0.XOV+T;0.XNXNV+V+T;T;0-T;T;T;XZXZ0-VJY$Y$VGVOXVXV0,VKXLXL0,VLXH0,VL0-0-SG0.SG0.VM0/VM0/VJ00VJ00VG01VGVGVOVGVO0001VOVO0102VOVO020304XE0405XEXE0506XEXE0607XEXE0708XEXE0809XEXE09VK0:VK0:VL0;VLVL0;VL0<0<SG0=SG0=VM0>VM0>VJ0?VJ0?VG0@VGVGVOVGVO0?XE0@XE0@VK0AVK0AVLVKVKVLVLVKVKT;T;VKVKT;T;VKVKT;T;VKVKT;T;VKVK0<VLVKVKVLVLVKVKVL0;VKVKY(Y(VKVK0:SGVKVKVNVNVKVKVNVNVKVKVNVNVKVK07VMVKVKVMVMVKVKVMVMVKVKVMVMVKVK04VJVKVKVJVJVKVKVJVJVKVK02VGVKVKVGVOVKVKVOVOVKVKVOVOVKVKVOVOVKVK0.XEVKVKXEXEVKVKXEXEVKVKXEXEVKVKXEXEVKVKXEXEVKVK0)VKVKVKXPXPV,U;XQXQU$THU$THU$THV,U;V,U;V,U;V,U;U;U;U;UZU;U;UZUZV>UZV>V>TVTVUZUZXXXXVPYIT,TWT,TWTWU:VCU:U$U$THTHU$U$THTHU$THU$THU$THTHTHV,V,THTHV,V,THTHV,U;V,U;V,V,THV,V,U;V,U;UZUZUZV4UZV4UZUZYJYJYWYWYJYJ/IY9YJYJY9YI/HYIYIYIYIX1/HX1X1W@X1X1X1W@X1X1W@X/W@X/W@W@W@X/W@X/X/X/X/X/X.X.X/X.X/X.X/X/X.X.X/X/X.X.X.X.X.WZX/X/X.WZX/X/WZWZX/XUWZWZWZVTVTVTVTVTVTUVT,TWT,TWT,TWT,TWVCU:VCVCVCU:VCVCU:U:VCU:THTHU$U$THTHU$U$THTHU$THV,U;T>T>T>T>V,U;U;U;T>U;T>U;U;U;U;U;U;V@U;U;V@V@U;XNU*XNYJYJ/*YWYWYW/*YWYW/*/+/,YWY9/,Y9Y9Y9/,/-YIYI/-YIYIYIYI/-YIYIYIX1YIYIX1X1YIYIX1X1/*X1X1X1X1X1X1/*X1X1/*X1W@W@X1W@X1W@X1W@W@X/W@X/W@W6W6W6X/X/W6X/X/X/X//%X.X.X/W>X//$X/W>X.X.W>W>WZWZW>X,W>X,X.X.WZWZX,WZX,WEX.X.WZWZWZWEWZWZWEWEWZVTWEWEVTVTWEW;WEW;W;W;W;VTW;W;VTVTW;VTUVT,XJXJVBU=U=V5.NVBV5VBV5V5VBVBU'U'VBVBU'U'TXTXVBTXVBVBU$V.U$V.U$V.U$.IV.V.V<V.V..HV..IV,V,VDV,V,U;V,U;V@U;V@V@V@V@U;V@V@U;V@V@U;V@V@V@V@V@U*U*Y6.BY6Y6.BYB.C.DXGXGY).DYJ.D.E.F.FYW.GYW.G.HY.Y..H.IY..J.J.K.L.M.M.NZ'Z'.N.OZ'Z'.OYX.P.Q.Q.R.SYI.S.T.U.V.V.WYGYG.WYI.X.YYIY>YI.Y.Y.Z/#/$/$/%/&/'YI/'/(/)/)X1/*/+/+X1/,X1X1X1/,WRX1X1WRVRX1X1WLWL/*/+VRVRWLWLVRVR/*X)/+/,X)X)/,X)/,WKVR/-WKWKW%/-X)X)X)/-X)W@X)W@/,/-/.//WJ///0/1W@/1W@W@W@W@/1W6W@W@W6W6W6X/W)W)W6W6W6W)W)X/W)/.X/X//.X/X/X.X.X.X.WUX.WUWEWEW;W;VBVB/+VBVBUCXRUC/*UCUCUCVB/*/+/,U$U$/,/-UCUCUC/-TYTYUCTYU$V<U$V<V<V.V<V.TY/*TYTYTNTN/*TN/*TNTN/+/+TZ/,/-V@V@/-/.V@U;V@V@V@/-/.//TDTDV@TD/.UPUP//U0U0U0U)TD/.V7V7V7V7U)UO/-YBYB/.YBYB/./////0YK/1/1/2/3/4YK/4YK/5Y.Y./5Y.Y./5/6/7/7/8/9/:/:/;/</=/=Z'/>/?Z'Z'/?/@/@/A/B/C/C/D/E/F/F/G/HY?/H/IY?Y?/I/JY1Y1/J/KY1/L/L/MY?Y?/MYI/N/OY?Y?Y?/OY?Y?/O/PYIYI/P/Q/Q/R/SZ&/S/TYIYI/T/UYIYI/UYSZ&/V/V/WWMWM/W/XYI/YVXVXVX/Y/YX1WMVV/Y/ZVVVVVXVV/Z0#X1WRVVWRWRVRWRWRVVVVWSWSVRVRWSWSW%/WVRVRW%W%VRVRW%W@W%W%VRVR/UX+W@W@W5W5W@W@W5X*W5W5X+W5W6W6X*X*W6W6/QX*/QW)W)W)W)W)X*X*W)W)/P/QX*WXWXWX/PWXWXWXWXWXWX/PX/X//PX//PX.X.X.WX/PWXWX/PWX/Q/RX.WUX.WUX.WUX./QWZW;WZWZWEWZWEWEUC/OUC/PTGTG/P/QUC/QUCTY/QTY/RTY/RTNTNTNTN/RTN/STZTZ/S/TTN/TTN/U/UUU/VUUV@/V/W/X/X/YUUUU/YUUUUUU/YU0XNXNYDYDYD/YYDYD/YYDYD/YYD/Z/ZYD0#YDYKYK0#0$YK0$YKYK0$YO0%0&0&0'YOYO0'0(0)0*0*0+0,0-0-0.Y,Y,0.0/000101020304Y,04Y,05Y;Y;05Y;XXYTY;Y;YT04Y;Y;YI04Y;05YIYI0506Y;06Y;07YIYI0708VUVUW#VU0708090:W#W#0:XYVUVUVWVUWVWVWV09VWVW090:WVWS0:WVWSWSWVVRVW09VW0:WV0:0;0<0<VR0=0>VRVR0>0?0?0@0A0B0B0CW/W/VRVR0C0DVRX+X+X+0CX+X+X+X+X*WXWXX*X*WXWXX*X*WXX*X*X*X*0@X*WX0@WXWXWXWX0@0@0AWP0BWX0B0C0DWPWP0DWWX(0DX(X(0D0E0F0GUC0GXRV?0GV&0HU20HTY0I0JV&0J0K0LTYTYTP0LTY0LTYTNTY0LTNTN0LUU0MUU0MUU0NUUXHY@XHS<0M0NS<0OYD0O0P0QS<0QS2S20QT)0RT)YO0RT)YE0RT)S2T(0RT(T(T(0R0SY,XXT(T(T(S;Y;Y;XX0R0R0S0T0U0U0V0WVS0W0XW+0Y0Y0ZVYVYVSVYWT0ZVYVYWTVY0YX&0ZX&0Z1#VY1$X&1$X&X&1$VW1%1&1&1'W:W:W:W:1'W:W:W:W:1'1'1(W:1)1)1*1+1,1,1-W<W<W<1-W<1.X+X+W<W?X+WXWXWX1,W?W?W?WXWXW?WXWWWW1+1,V?1,UKUKU2U21,U2TO1,TO1-UKUQUK1-1-UJ1.1/1/TN1011UQUQ11UN111213UQ13XPUQXP13UUXPUUXPUUU1U1UUUUUU12UU1213UTX5S<1314S<S<SC14SCSCSCT$T$S2T$S4S2S2S4S2S2T(S2T(S2T(S2S2T(T(T#T(T(1.T(S;T(S;T(S;1-1.1/WTS;1/S;S;1/10WTWT10X&11X&1112WTWTX&X&12X&1213W.1414X&WHWH14W<X&15X&W<WHXZW<W<W<141415W?W?W<15W?W?15W=W?1616WX1718WXWX1819191:W?1;WXWX1;W?W?WX1;X01;1<1=W?1=X0X0X0WXWXX0WX1<WX1=WXWXWXWX1=WXWX1=WXWXWX1=1>WX1>WX1?1?1@X#X(UK1@XQUN1@UNUNUNUN1@UNUNUN1@UNU-UM1@1ATJ1ATCU-1BU1U1TMTMU1UTU1U1XOXOV=TFU<1?U<XOUTU+U1V'V'1>XOXOV21>XOXOV*1>XNTK1>T.US1?1?SCT$T$XHT$S?1?SCT$T$T$T$T$S?T$T$S4T$S4T$S4T$S4S2S2S4S4S2S2S21:S2T#T#T#SZT(SZSZT(SJSZSJSZSJSZSJ16SJSJSJSJSJSJ1616WTSJWT16WTS3S3WT1617VQWTWTVQVQWTWTWTWHWHWHVQWHW?14W?Y$W,14Y$X0X0141516X-W$X-X-15W$16W$1617W$18W$18W$1919W3X-1:WXWXW3WX19WXY&Y&Y&WGWXWG18WGWGWG18U-XPXP1819U&UFV$TFV$TFXOXO1819TF19TF1:XN1:TKV;TK1:TKTK1:1;S?1<S?1<S7S>S4S4S41<S>S>1<SDS>1<1=S>S4S4S41=1=T%T%T%1=1>S/S/T%1>1?S01?T#T%T#1?T#1@SM1@T&1A1BT#T#SM1BT#SZSM1BSM1B1CSBSZSZ1CSZ1CSZSZ1DSZSZS5S5SJSJS5SHSJ1BSHSHSJ1BSJS1SJSHSHSH1A1BS1S11BVQ1C1DS1SWS1S1VQVQVQSWVQVQSWSW1AW*1BW*W?X0W?X0Y$X0W?W$X0W$X01@1@1A1BWN1BW$W$W$WNWNW$W3WN1AWN1BY&Y&W3WGWXWGY&WGWXWGW3WBZHZGZHZHV$V$TFXOXOTFU.U.TF1<TFTFTFTFTFUGTKU/TKTETKTKUGUGTETEUGTEU/18U/V%V%TLV%TLU/U/TEV0V%TLV0TBXMXM15XMSX15SXSX15S016S01617S0XGSM1718SBSSSBSN18SBSBSNS9S5S5S517S5S5SLS5SBS9S916S5S516SQSHSHSQ1616SQSQSQSQSQSQ16S1S1SHS115SI16SISISY16SYS1S1S1SWS1SWSWSWW$14W7WA14WAWAWA14WA1516W7WB16WOWBWB1617WBWG17WBWBWFWOWFWG16WFWFWFWFWFW8W8ZPW8W8ZPY'W8W8U.U.1314U.U.14UBUB14UBUBTFTFUBUBTFUGTFUGUBUBUBU%U%UGU%UGUGV0UGUGUGV0UGV0TBU(TBU(1-U(1.U(U(U(1.U(SN1.S9S91.1/1011S911S9SLSLSLSLSQ10SLSPSL10SQSLSQSLSQSQSQSQ1/SQ10SQ10SQSQ10SI11S@11SYS@12SYSY12SYSWSWSYXY1112S@S@W7WOW7W7WOWOWO11WOWFW7W7WFW8WFW8W8ZSW8ZSW8ZSW8ZSZ7Z7Z7ZAZZXKZZZ5Z<XJZOXJZOXJZ5ZOXJZTZOXJ1(V/UBUBV/U%V/1(UBUAUBUAUG1'UAV)V)UGV)TTV)1&UAUAUGV0TTTTV0V0TTTTTBTBTTT/T/U(T/U(TTT/TTV3T/0Y0ZT?U(U(T?T?0Y0Z1#1$T?1$T?T?1$1%UEUESPSPSP1%SQSQSQSRSPSRSRSR1#1$SRSR1$1%SRSRSR1%SR1&1&ST1'STZ.Z.XYZ3Z3Z*Z3Z*W7W7Z,Y%W71$Y&Y&WFW-WFW-W8W8Y'X@W8Y'X@X@Y'X@XEX@Y'W8X@X@W8ZSY'X>ZSZSX>X>ZAZAZSZSZAZAZ;Z;Z=Z=Z=ZXZTXIXIZVZVZVZVZ@UBUA0PUAV10PV10QUAUAUA0QUAT=0QT=TTTTUATITTTTTITIT=0OT=TITITI0OTI0OV3V3V30OV30PV30PT?0QT?SPSPT*T*SPSP0PT*T*SET*SESRSRSE0OSR0O0PSFSFSF0P0QSFSTSFSF0PSTSTSTSF0P0QSTXEX@XEX@XEX@XEX@X@0OX@X@Z;XVZNZNV1T10N0OT30OT70P0PT=T2T20P0Q0R0ST=T=0S0T0T0U0VV3T2T=T20V0V0W0XV3T*SET*SET*T*T*SGT*SGSGSGSESESE0U0USGSGSGSGSG0U0VSGST0VST0VSGSGSGXEX@XEX@XEX=XEX=X=X>X=XFX>X>XFXFX>X>XF0RX>X>0R0SX>XUXFXU0RT80S0T0TT50U0VT4T2T90VT2T2T20VT90VT7T70V0W0XT0T20X0Y0Z0ZV3UR1#1#1$T0T0URURT0XN1#SGSGSGXEXEXEXA0ZX=XAY'X=XFX=0ZX=0ZX=1#XFXFXD1#XFXF1#XFV1V1V11#1#T7T7T7V11#TRTRT0T01#T0T11#T1T1X=1#Y'Y'XDXDXBXB0ZXDXBXBTR0ZTRT60Z1#T6T6V+T6V+V+T6T60ZT60ZT1T6T6V+T;V+V+XNX<T;XNT;T;V+T;VMVJVMVJVHVKVHVKXLXLT;VLXHXHVLY(VLY(VLY(Y(SGY(SGY(SGY(SGVNVMVNVMVNVMVNVMVMVJVMVJVMVJVMVJVJVGVJVGVJVGVJVGVFVFVOVOVFVFVOVOVFVFVOVOVFVFVOVOVFVFVOXEVFVFXEXEVOXEVOXEVHVHXEXEVHVHXEXEVHVHXEXEVHVHXEXEVHVHXEXEVHVHXEXEVHVHXEXEVHVHXEXEVHVHXEXEVHVHXEXEVHVKXEVKXEVKXEVKT;VLT;VLT;VLT;VLVLY(VLY(VLY(VLY(Y(SGY(SGY(SGY(SGVNVMVNVMVNVMVNVMVMVJVMVJVMVJVMVJVJVGVJVGVJVGVJVGVOXEVOXEVOXEVOXEXEVKXEVKXEVKXEVKXOVLVKVLT;VLT;VLVLY(VLY(Y(SGY(SGVNVMVNVMVMVJVMVJVJVGVJVGVOXEVOXEXEVKXEVKYJYJ/V/WYJYJ/WYIYIX1YIYIYJYJYJ/VYJ/VYJYW/VY9Y9Y9XTY9/VYFY9Y9/VY9YW/VY9Y9Y9Y9/V/WY9/WYIYIYIYI/WYIYIYI/WY>YIX1X1X1X1X1/V/WX1X1X)X)X/X//VW6X/W>X/X/VBVBU=VBU$V<U$V<V.VDV.VDV./RV.V.Y6Y6Y6/RYBYB/RYB/R/SY6Y6Y:/SYBYBY)Y.Y)/SYJYJYJ/SYJY5Y5Y5Y5/RY5Y5/RYWYWYWYWYWY5YWY5Y5/Q/RY5Y5/R/SY5/SY5Y5YW/S/T/UY./UY./VYWYFYWYWYFY9YXYXYWYWYWYNYN/SYN/T/TYWY5Z'YWXTZ'Z'XTY=/SY=/SZ%Y=/TY9/TYXYXYNYNYN/TYN/TYNYN/T/UYXYI/UYIYIYI/UYIYN/VZ%Z%/VZ%Z%Z%Z%/V/V/WZ'/X/X/YYGYG/YYGYGYG/YYGYGYGYIYIYGYIYG/XYGYGYIYI/XYI/XY>/YYI/YY>Y>Y>Y>Y>Y>/YY>Y>YIY>Y>YP/XYPYIYIYI/XYIYIYI/XYI/XYIYIYZYZYZ/X/X/Y/Z0#0#0$YPYPYP0$YP0%Y>X10%X1YP0%0&0'X1X10'X10'0(0)0*0*X1X1X1X10*X1WRX1X1VRVRX1WLVR0)0)0*0+X)WLX)WLWKX)X)WKWKX)X)WKX)WKWKWLWKWK0'VR0(0(WKW%W%X)X)X)0(WK0(WKWK0(WJ0)WJWK0)W%W%W%0)W%W%0)0*W@W@0*WJW%WJWJW@WJW@W@0)W@W60)W6W6W6X/X/WXWXX/X/WXWXVBVB0'0(0(UCUCUCU$U$VBU$VBVB0'0(VBVB0(TSU$U$0(U$U$U$U$0(UCUCUC0(TNTN0(UX0(TNTYTN0(TNTNTNTN0(TNTNV@V@TZTZ0'TZTNTN0'TZ0(0)TZ0)TZTZ0)V@TZ0*V@V@UU0*V@UUV@UUUU0)UU0*V@V@UPUPUPU0UPU0U*V70(V7Y6Y6XGYBYBYBYKYKYB0&YK0'YBYBYKYKYBYBYB0&YBY)0&0'YK0'YKYKY)Y)0'0(0(0)0*Y.0*0+YKYK0+Y.0,0-YKYKYK0-0-0.YK0/Y.Y.0/Y.Y.0/0001Y.01Y.0202YM03YM03Y.0405Y.Y.05060607YO080809YOYOY.090:0;0;0<Z$Z$YO0<YOYO0<0=0>0?Z'Z'0?Z'YM0?0@0A0A0B0C0DZ'Z'0D0EZ'Z'0E0FZ$0FZ$0G0GY/0H0I0I0J0K0L0LY20M0N0N0OY2Y20O0PY20Q0Q0R0SY-0SY10TY10T0UZ'0V0V0WY?Y?0W0XY?Y?0XYGY?Y?YGYGY?Y?0W0XY1Y1Y?0XY1Y10X0YY10Z0ZY?Y41#1#1$1%1&1&1'1(Y?1(Y?Y?Y?YIYIY?1(Y?1(Y?Y?1(1)Y?Y?Y?1)YTYT1)Y?YTYTY?Y?YTYI1(1)Y?Y?YIYI1)YIYI1)1*1+1+1,1-1.Z&Z&YIZ&Y?Y?1-1.1.YIYIYIYI1.YI1/Z&1/10YI10YS111212YSWMWMYS12YSWM12X1WMWM1213YIYIWMWMY+13Y+Y+YIY+VXVXVUVUX1X111WMX1X1X111X1X111X1VX1112VU12VUVUVUW%W%12W%X+X+12X+X*12X*X*W6W612W)12W)WX1313WXWXWXW)WXWXWXWX12WXWX12X/WXWXX/X.X.X.WXX.WXWXX.X.WXWXWXWX1/WX1/X.10X.WUWUX(10UCTGTGTGTGTGUCUCTGTGUCUCTGTGTYTY1,TYTYTYTGTYTGTGTGTG1+TY1+TNTNTNTN1+TNTZTNTZTN1+TZTZ1+TZTZ1+1,1-1-1.1/U31/101112U312U313U31314UUV@V@V@1414V@15UU1516UUUUV@V@1617V@17UUUU17UUUUUU17U0U0U0YDYD1718YDYD1819YKYK19YK191:YDYD1:YD1;YD1;YDYDYD1;1<YDYD1<1=YDYDYK1=YK1>1>YO1?YOYKYKYK1?1?YO1@YOYOYOYO1@Z(Z(YOZ(1?1@Z(Z(YRYR1@YRZ(Z(YOYO1?1@YOYL1@Y-YRY-Y-1@Y-1A1A1B1C1DY-1D1EYUYYYYY,Y,1D1EY,Y,1EY11F1GY1Y11G1HYVYV1H1IYVYV1IYV1I1J1K1LY1Y11LXXYVYV1LY;YVXXY;Y;Y,1KY,Y;Y,Y,Y,1K1KY;1LY;YTYIXXXXYIYI1KYIX%X%Y;Y;X%X%X%1JX%1JX%X%1JX21K1LY;1LY;1M1MYI1NX%YIYI1N1O1OW#1P1QW#W#W#1Q1Q1RX&X&1R1SX&X&1SW#X&X&1S1TVWVWVWVWX&1TVWVW1T1UWVWV1UWVWVWV1U1VVW1VVWVWWVX$WV1V1V1WVWVWWVWVVWWV1VVR1WVRVRVRVR1WVRVR1W1X1X1Y1ZW'1Z2#W'W'X$2#2$2%2%2&2'2(2(W/2)W/W/W/2)W:2)2*2+W'W'W'W'X+2*W'W'W'W'2*W'W'W'W'X+X+X*X*WXWXX*WXWXWXWXWXWX2'WX2'2(WP2(WPWPWPWPWP2(2)WX2)WXWXWXWX2)WP2)2*WPWP2*WW2+WWX(WEX(WEUCUCUC2*2*TYV&V&UC2*UCUCV&V&2*V&UCUC2*2+UCUC2+2,V?2,V?V?TY2,V&TYV&2,V&V&V&2,V&2-V&2-V&V&U22-U2U22-2.U2U22.TYTOTPTYTNTNTNTNTN2-TN2-2.TN2/2/20TNUUTN20TN21TN21TN2222YDYD23YDYD23YDS<23S<S<YDYDS2S22223S<S<23S224S2S2S2S<S2S2T)23T)23T)24T)YOYOYEYET)T)S2T)22T(T(T(Y,22Y,23Y;Y;2324WI24WIWIY;Y;24Y;Y;24252626W+WIW&W+W+26W+XX26W92727W+2829292:S;W92:Y;W+W+2:2;W+W+W+2;W+2<2<2=2>VY2>VYVYVYWT2>WTWT2>X&2?2@VY2@2AX&VY2AVYVYX&X&2AX&2AX&VY2BX&2BX&X&2B2CX&2DX&W:2DW:2DW:W:W:VW2DW:W:W:2DW:W:X&2DX&X&W:W:W:W<W:2CW:W:2CW:W:W:W:W:2C2DW/W/2DW<W:W<W<W<2CW<W<W<W<W<W<W?W:W:W:2B2BW<2CW<2C2DW<2EW<2E2F2GW?W?2GW?WW2GWWX(2GX(X(X(V?U2V?2GUKU2UKUKTOV#TOTOTOTOTO2EUKUQUKUK2DTNTOUJTO2D2E2FUJUQUQUQTNTN2ETNUQ2EUQUQTNTN2ETNUQUNUQUNUQUQ2DUQUQ2DUQUQ2DUQUNUQ2DXPUJXP2DUUXPXPUUUTUUUTUUUTUUUTUUU1U1U1X5SCSCSCS<S<SCSCSCS2SCT$2>S;T(S;S;2>2?2@VSWTWTWTS;WTS;S;WTWTS;WTVYVYWTWTWC2<WT2=X&X&WTX&WTWTWT2<WT2<WTWT2<WQ2=2>X&X&2>X&WQX&W.W.X&2=W.2>W.2>W.WH2>X&2?XZX&2?X&2@X&W<X&W<2?W?W?W?W<2?W<2@2@W?W?W?W<W?W<W<W?2?W?2@W?2@W?W?W=WXW=W=W=W=W?W?W=W=2>W=2>W=W=2?W?X'2?2@W?W?W?2@2@2A2BW,2BW,W?W,X'X'2BW?W?W?W?2BW?W?W,2BW?W?2BW?W,2BW,2CW?X0W?X0X0WX2BWX2BWXX0X0WXWXWX2BWXWXW$WXWXWXWX2AWXWX2AWXWXWX2AWXWXX#Y&X#WXX#2@X#X#Y&2@X(UKUKUK2@UKUN2@UNUN2@UNUNUMUMUNU-UMTJ2?TJUM2?UMTJUM2?U-TCTCV=V=V=U<V'U<U<V'V2XOV2V2V*XOXO2;VAV:V:2;V6U@2<U,U,U#UIXHSCXH2;2;S?S?S?S2T#T#T#S;2:SJSJSJS3SJS3XYWTSJWTSJSJS3S3WTWTVQ27WT27VQVQW?W,W?W,W,X026X0WXWXX0X-X0X0W$W$24X-W$W$W$W$X0W$X023X0W$X-23W$W$W$X-W$23W$23W$W$WXWXW$WXW$W$Y%WX21W$X-W$21W3X-W3WX21WXWXX#X#Y&WGUN20XPU-U-V=U&U&V=V=2/20TK20TKTKTUU@20TKTFTKTKTKTKTK2/TKUIUIV;V9V(V(2.TKXHS?XHS6S?S?2-2.2.S?S7S7S?S4S?S4S4S4S>S4XH2,XHSDS>S4S>S/SDS>2+SXS4T%S4T%S4S4S4T%S4S4S/S/T%T%2(T%S02(S0S0S/S0S/2(T#T#2(T#T#T#T#2(2(SMSMSM2(T&SOT&S02(S0SOT&SMT&SM2'SMSMSMSMSBSM2'2'SB2(SZSM2(SMSBSZSZ2(SZ2(SZ2)SZSZSZSZS5SJSJSJSHSJS3SJS1S12&S1S12&S3S1S1S3VQS3S3S12%S1SAVQVQ2%XYW?W?2%W*W?W*W*W*W$W$2$Y%W$W$W$WN2#W$WNWNW$2#W$W$X02#X0W$X-W3WNW3WNW3W3W3TKTKTF1YU/XNU/V%TLTLTLTBSX1WSXSX1WS0S/S01WS0XGS01W1X1Y1Z1ZSM2#SMSMSMSBSBSMSB1Z2#SSSSSNSNS5S5S51ZS9SLS9SL1YS5SQSQSHSH1YSQSQSQSLSQSQSQSQ1XSQSISQ1X1XSISISISI1X1YSYW$W$WA1YW$W$W$WAWAWA1XWAW71XW7W71XW7W7W7WO1XWOWOY&W(WB1X1XWBWBWBWBWBWF1XWGWGWGWFXOU.UBU.U.U.1VU.U.U.1VUBUBU.UBUBTBU(TB1UT/U(T/U(U(U(U(1TSNS9SNS9S91S1T1US9S9SL1USP1UXTSP1USPSPSPS9SLSLSL1TSLSLSLSLSLSLSQSQ1SSQ1T1T1USQ1VSQS:SQ1VSISI1VS@1VS@S:S@1VSY1W1XS@SYS@S@SYSY1WSYS@SYS@S@SYXY1VXYWOWF1VWFUBV/UBUBV/V/V/UAUGUGUG1TV)V)V)1TT/T?T/T?1SV3V3V3U(V-1ST?V-V-T?1S1ST?T?T?T?1ST?UET?1ST?T?1S1T1U1VV-V-1VXLSPSPSP1VSQ1VSR1WSRSR1WSQSQS@SRSRS@S@1VS@SRSRSR1V1V1WST1XS8STS8STS8ST1WS8WFWF1WWFUBUB1W1X1XUA1YUAV1UAV1UAUAUA1XUAUAUA1XT=1XTITITITITI1XTI1XV3V3V3TIV3TI1X1XV3V3V3T?T?V31XV3T?V3V31WSPT*T*SRSRSE1WSRSRSRSFSRSFSFSFSE1USESESFSFSE1USTS8ST1U1USTSFSTSFSF1USFX@X>X@X>V1V1V1T8T4T4T8T4T3T7T3T71QT7T7T7T71QT7T7T1T1T11QT:T21QT2T41QT4T41QT2T1T2T2T2T21Q1QT=1RT=1RTIT=TITIV3V3V3T=T=T=1QT2T2T21QT=T21Q1RT2V3V3V31QV3V3V3SE1QSG1RSE1RSESGSG1RSG1S1SSGSUSGSGSGSG1SSGSVSGSGX>X>XFXFX>X>XFXF1P1QXFXFV1T8V1T8V1T8V1T51OT5T5T5V1T5V1T5V1T5T71NT5T51NT71NT21OT2T2T2T21OT9T2T91OT21O1PT01PT0T0T01PT0T0T01P1Q1RURT21R1S1T1TURURUR1TV3UR1U1U1VURV3T01VT0T01VURT01WSG1WSGSGXEXEXA1W1WXFXFXFXD1WXDXDXDXD1WXD1W1XXDXD1XXDXDXDV11XV11Y1YT7T7T7V1T7V1T1T0T01XT0T7T7T1T11WXDXDXDXDXDXDXBTR1VTRT6T1T1T61VT1T11V1WT6T6V+T6T1T1T6T6YW1UYWYW1UY91VY9YJYJ1V1WYJYJYJYWYWYWYJ1VYWY9Y9Y9YWYFYWYFYFY9YFY9YWY9Y9Y9Y9Y9Y91RY9Y9YIYIY9Y9YIYIYIYIY9YI1OY>Y>Y>1O1PX)X)X)1PX)X)X/X/X/W6VDVDV.VDY6Y6Y61N1NYBYB1O1O1PY6Y6YBYBY6Y6Y:Y:YBYB1N1O1P1QYJ1QYWYWY5YWY5Y5YJYW1PYWY.1PY.Y.1PY5Y.1QY5Y51QY.Y5Y5Y51Q1QYWY51RYWYWYWY5YWYWY.Y.Y5Y5Z'Y5Z'Z'1OZ'1OZ'1P1QYXYXYNYNYNYNYN1PYWYWY5YWZ'Y=Z'Z'Z%1NZ%Z%Y=Z%Y=Y=Y9Y9YXYXYNYN1LYNYN1LYNYNYXYIYXYXYIYIYX1KYIYI1KYIYXYXYNYNYNYIYNYNZ%Z%Y=Z%Z%Z%Z%YGZ'1GZ'Z'Z%Z%1GYG1GYGZ'YGZ%1GYGYG1GYGYGYGYNYNZ%YGYGYIYGYGYGYIYG1EYGYIYIYI1DY>Y>Y>Y>Y>YIYIYIYIY>1CY>Y>Y>1CY>Y>Y>1CYIYIYI1CYIYIYZ1CYIYZ1CYZ1C1DYSYP1D1EYIYIYP1EYIYIYIYIYI1EYIYIYI1EYZYZ1EYPYZYP1EYPYPYPYP1EYPX1X1X1Y>Y>1DYPYPX1YPYPYPYP1C1DYP1DYP1EX1X11EX11EYIYIYIYP1EYI1FYIYIYI1FX1X11FX1X11FX1X1X11FX1WRVR1FVRVRX1X1X11FX1X1X)X)X11EX)X)WKWK1EWKW%W%VR1EW%WKW%W%X)X)X)WJX)WKWKWKWJWJ1BWJWKWJWKWJWKW%W%W%W%1@W%W%WJWJWJW@W@W@1?W@WJWJ1?WJW@1?W@W6W@W@1?W6VBVBVB1?VBVB1?1@VB1@UCUCVBVBUCUCVBVBUC1?VBVB1?UCU$U$TSTYU$U$TYTYUCTGUC1=TY1=TYTY1=1>TNTN1>TNTNTNTN1>TNTN1>TZ1?1@TZTZULTZ1?UL1@1ATZTZTNTNTZ1@TZTZ1@V@TZV@V@V@TZTZ1?UPUUUPUU1?UUUPUU1?UUUUTDTDTDV7YBYBY81>1>Y8YK1?YBYB1?YKYK1?YK1@1@1A1BY0YK1BYKYK1B1CY0Y01C1DY0Y0Y)Y)1D1E1E1F1GY.1G1H1I1J1JY0YK1KY0Y01KY0Y0Y.1K1L1L1MYKYK1MY.1N1O1O1PZ)Z)YK1P1Q1R1RZ)1SZ)1S1T1U1VY.Y.1V1WY.1WY.1XY.Y.Y.1XY.1X1Y1Z1Z2#2$YMY.YMY.Y.2#YMYMYMYMYMY.YM1ZY.2#Y.2#2$Z)Z)2$2%Z)Z)2%2&2'Z$2'Y.Z$2(Z)Z)Z)2(Z)Z)2(2)YO2)YOYOZ)2)2*2+2+YOYOYOY.Y.Y.2+2+2,2-2.Z$2.Z$Z$2.Z$Z$Z$2.2/Z$Z$2/20YOYO202122232324YAYA2425Z(Z(YAYAZ(Z(Z'Z'2425YMZ'YMYMYMYMYM24YMYM242525Z'YMYMZ'Z'2526YMYM2627YM2728Y/2829Y/Y/Z'Z'Y/Y/2829Y/Y/29Z'Y/Y/Z$29Z$Z$Z$292:2;2;Y/2<2=Y22=Y2Y22=2>Y2Y2YA2>YAYA2>2?Z(Z(2?2@Z(Z(Z(Z(2@2AY2Y2Y22AZ(Z(Z(2AZ(2A2B2CY/Y/2C2DY/2D2E2F2F2GY2Y22G2HY2Y2Y2Y12HY1Y2Y22H2IY2Y22I2J2JY-2KY-Y22KY12LY1Y1Y-2LZ'2LZ'Z'2LYGYGYG2LY?Z'2MYGYG2MY?YGYGY?Y?Z'Z'2LY?2LY?Y?Y?YGYGY?YGY?Y?2KY?Y?Y?2K2LY?Y?Y?2LY?Y?Y1Y1Y?2KY4Y4Y4Y4Y12KY?Y?2K2L2LY?Y42MY4Y4Y42MY42MY?Y?2MY?2N2OY?Y?2OY1YGYGYG2OYGYGY?Y?2N2OY?Y?YIY?Y?Y?YIYIY?Y?Y?2MY?Y?2M2NY?Y?2NY?Y?Y?Y?Y?Y?2NY?Y?2NY?YIYIY?2NYIYIY?YIY?2MY?YIYIYIYIYSYIYI2LZ&2L2MZ&Z&YS2MYSYS2MYSYSYSYSYSZ&2MYSYSZ&Z&Y?2LY?Y?2LYIYIYIY?2L2M2N2NZ&Z&Z&YI2NYIYIZ&Z&Z&YI2MYIYIYI2MYSYSYSYSYS2M2NYSYS2NYSZ&WM2NWMYPYPYSYSYPYPYP2M2M2NYIY+Y+WMY+Y+Y+VXY+Y+WM2LWMWMX1X1VVVV2KX1VVX1VXVX2K2LVU2LVUVUVXVX2LVUW%W%VRVRX+X+2KX+2K2LX*X*2LW)W)W)W)W)X*W)2K2LWXWXW)W)2LWXWX2LWXWX2LX/X/X/WXWXWXX.WXWXWXX.2JX.X.X.X(WUX(X(2ITY2JTYTY2JTYTYTYTYTY2JTNTZTNTZ2I2JTN2K2KTZU3U3TZTZ2K2LTZ2LUUUU2LV@UUUUTNTNTNU32K2L2MU3TN2MTN2NTNU3TN2NU3U3U8U3TN2MTNTN2MU52NTNU3UUU3UUU32MU32NU3UUUUUU2M2NUUUUV@V@V@2N2NV@V@V@V@UUUUUUV@V@V@UUV@2LUUUUV@V@UUUUV@V@UUUU2JUUUUUU2JUUUUUUUUUPUUUPYD2IY@Y@Y@2IY@Y@2I2JY@Y@YDYD2JYDYKYK2JYKYD2JYDYDYKYKYDYDY@2IY@2JY@2JY@YDY@2JY@YDYKYKYDYDYKYKYD2IYKYK2I2JYKYK2J2K2KYO2L2MYK2MYKYKYOYO2MYO2MYOYKXTYKYKYK2M2MYOYKYOYKYOYKXT2LYOYOYOZ(2LZ(Z(YRYR2LYRYRYRZ(2LZ(2LZ(Z(2L2M2N2O2O2P2Q2RY1Y1Y-Y-Y-2QY-Y-YLYLYL2QYL2QYY2RYL2RYYYYYYYYYY2RY-Y-2RY-2R2SYUYU2S2TYYY,2TY,Y,Y,2TY1Y1Y12T2U2VYVY1Y1YVYVY12UYVYV2U2VYVYVYUYVYUYVYVYVYVY,YVYV2TYVY1Y12TY1Y1Y12TY12TYVYVYVYV2TYVYV2T2UYVYV2UY;2VY;Y,Y,Y,Y;Y,2UY,Y,Y,Y;Y;Y;Y;Y;Y,Y,YIYIYI2SX%X%Y;X%YIYIX%X%Y;2QY;2RY;2RY;Y;2R2S2TX&2TX&X&X&Y;X&Y;X&YIYIX%YIX%X%2RX%YIYI2RYIYI2RYIW#X2W#X2W#X2X22QX2W#W#X2W#W#W#2PW#2P2QX&X&2Q2RX&X&2RX&X&X&X&W#X&2RW#W#2RW#WVWVVWVWWVWV2Q2RVWVWX&X&VWVW2QVWVWVW2QVW2QWV2RWVVW2RVWVWWVWVVWWVVW2QVWVWWVX$WV2Q2Q2RVW2SWVWV2SWVVRVR2SVRWS2SWSVRVRVRVR2SVRVR2SX$X$W'W'W'2RVRW'W'VRVRW'W'W'W'2Q2RVRW'W'W'W'2QW'W'2Q2R2SX$X$X$2S2T2T2U2VW/X$2V2W2X2X2Y2Z3#3#3$W'3%3%3&W'W'W/3&WV3'WV3'WVW/W/W/3'W/3'3(3)3*3*3+3,3-3-3.W'W'3.3/W'W'VRVRW'W'3.WXWPWPWXWX3.WPWX3.3/WPWX3/WPWPWPWPWP3/3/3031WWWXWXWX31WXWXWX31WX31WPWP31X.WPX.WPWPWP313132WWWWUCUCUC32UCTYUCV&UC31UC3232V&V&V&UC32XRV?3233V?V?V?33V?V?V?33V?U2V?U2V?V?TYTY32TY32TYV&V&TYTYV&TYV&TYV&31V&TYV&TYV&V&U230V&V&U2U2V&TY3/U23/30TPTP30TNTNTNTN30TNTNUUUU3031TNUUTNUUTNTNTN3030UUUUUUUUUU30UU30UU31UU31UUTNUUTNUUUUUU30YDYDYDYDYDS<3030YD31S<S<31S<S<S<31S<S<S<S2S<31S2S231S231S2S2S2S231S232S2S2S232S232T)T)T)T(32T(Y;Y;3233Y,33Y,Y,33Y;Y,XX33Y;Y,Y;W033WI34Y;Y;W0W0Y;Y;3334Y;34353636W+W+W+W0W036WI36373839W&W&393:3:3;3<W23<W+3=W+3=3>VSVSW+W+VSVSS;3=S;3>3>3?W93@Y;Y;3@3AY;Y;Y;W+Y;3@W+W+W+W+W+3@W+3@VYVY3@Y;W+W+3@3AVYVY3AVYVYVY3A3BVYVYWTVYWTWTX&X&3AX&3AX&VY3BX&X&3BX&3BX&X&X&VY3B3C3D3DX&3EX&3EX&VY3FVYVYVY3F3FX&3G3H3HVWX&X&VWVWVW3HVWVW3HVW3HVWX&VWX&X&X&W:VWVWW:W:3F3GW:W:W:3GW:W:W:W:X&3GW/3GW:W:3GW:W:W:W:W:W:3GW:W:3G3HW:W<3HW<W:W<W<W<W:3GW:W:W:3G3H3I3IW<W<W<W<3IW<3J3JW?3KW?W<3KW<W<W<3K3L3MW<3MW<3N3NW?W?W?W?W?3NW?WWWWWW3NWWY'X(Y'V?U2V?V?TOTOUQUQV#3KV#V#UQUJUQ3KTO3KTOUQ3KUQUQUQUJ3KUJUJUJTNUJ3KTNTNUJ3KUQUQ3KUQ3K3LUJUJUNUQUN3L3LTNUJUJTN3LXPTNT(S;T(3L3LVSWTVSS;S;S;3L3LWTWTWTWC3LWCWCWCWCWT3LWTWTWT3LWT3LWTWTVZWQ3LWQWQWQWTWQWQWQW.W.X&X&WHX&X&3IW.3JW.W.W.WH3I3JWHWHWHX&3JX&3JXZWHWH3JW:3K3LX&3LX&X&W<W<W<W?W<W<W<3KW<W?W?W?3JW?W?W?W?W?3JW=3JW=W?W?W?W=W?W?3I3JW?W?W=3JW=W=W=W=3JW=W?W?3JW?X'X'W?W?W?W?W?3IW,W,3I3J3JW?W,W,3J3K3LW,3L3MW?W,X'X'W?W?W?W?W?X0W,3KW,W,3KW?W,W?W,W,3KW?W,W?W,W,X0WXWXWX3IWXX0X0WXWXW$W$WXWXWX3HWXWX3HWXWXWX3HWXWXX#X#X#X#Y&X#X(UKUKT@3FUKUKUNUNUN3EUNUNUM3EUM3FUMUM3FTJTJ3FTJTCV*3FV*V:T-T-T-3FV8T.3FT.XHSCXH3FT$T$3FS?S;S;SJSJ3EWTVQVQWTWTVQVQ3DX0W,X0X03DW$W$W$W$X0W$X-X-3C3DW$3DW$W$W$3DW$W$W$W$X-W$W3W3X-W33B3CWXWXUN3CUNU-U&V=U&V=V=V=V=UFT<T<3AT<3ATUTKTKTFTFTF3A3AV(TKTKS?S?3AS6S?3A3B3CS?S?S?3CS>S>XHSDSDSDSDSXS/T%S/S/T%3@S0S03@S0S0S0T%T#T%T%T#T#SMSMT#SMSMSMSOT%SO3=SOT&SOT&T#SMSMSMSM3;SMSBSMSBSMSB3:SBSBSBSMSBSMSB39SZSZSZSZSZ39SZ39SZSZSZS3S3S1S1S3S3S1S1S3S3SASASASA36SWW?W?W?W*35W$W$W$W$W$WNWNW$WNW$WNX0W$X0W$TKTKTF3232S/S/S/S/S/S/S0S/S/S/S0S030S031SOSOSO31S031S0S0313233SOT&T&T&33T&33T&XGSMSMXTSSSBSBSSSBS531S5S5S5S531S531SQSQSQSQSQSQ3131SI32SISQSQ32SISISYSYSY3132SISYWAW$WAWAWAWAW731W731W7W7WA31W732WBWBWOWBWB31WBWBW(WBW(31WBWBWFWFU.U.UBU.U.U.U.UBU(U(3.U(U(U(U(3.S9S9S93.S93.XTSPSPSL3.SL3.SLSLSL3.SLSPSP3.SLSPSPS9S93.SLSQSISQ3.SQ3.3/SKSQSQSQ3/SKSKSK3/S:S:3/S:SQS@SQS@3.S@SKSKSK3.3/3030SYSYSYS@30S@S@30SYS@SYSYSY30SY30S@S@S@30WFWFWFUG30V)V)V)V)V)30V330V3V3V-V-T?30V-V-30UET?30T?T?30UET?UET?UET?T?V-U(3/V-3/U(V-V-V-V-3/V-V-V-V-UE3.V-UEUESP3.SPSQSQSQ3.SQSR3.SRSR3.SQ3/30S@S@SR30SRS8S8S8SRSRSR3/S8S8S83/ST3/ST30S830STSTW7WFW7WFUBUBUB3/UBV1V1V1V1UAV1V1V1V1V1UAUAUA3,T7UAUAT7T73+TITITITITITI3+TTTT3+V3TIV33+V3TI3+TIV3V3T?T?T?SPSPT*T*SF3)SESFSESFSESFSFSFSG3(S8S83(STSF3(SFSFSFSF3(SFT73(T7T7T7T=T73(T13(T1T1T:3(T:T2T1T1T4T1T1T23'3(T2T2T23(T=T=3(T=3(3)T=T=T=3)T=TIT=3)T=T2T23)3*V33*T2T2T2T2T2V3V3T2V33)V3SE3)3*SGSESGSGSGSESESE3)SGSGSG3)3)SUSUSUSGSGSUSUSGSG3(SV3(XFXFXFXF3(XFXFT5T8T5T5T73'T73(T5T53(3)3)3*T93+T9T2T9T2T2T2T23*T2T2T7T7T2T23)T0T2T0T7T0T23(T0T0T7T0T7T0T23'3(URUR3(URUR3(UR3)URT23)T23*T2T23*T2T23*T2UR3*URURURV3V3V33*V3V3URURURV3URURV3V33(V33(URT0T0URUR3(URURURT0T03'SUSGSGXEX=XAX=X=3&X=XFXF3&XDXDX=XD3&XDXFXF3&XDXFXFXDXDXF3%XD3&V1T7V1T7V1T7V1T7T7T7V1T7T7T0T73#3#XDX=XDTRTRTRT1T62ZT6T62ZT6T6T6T62ZT6T6Y9Y92Z3#Y9Y93#Y93#Y9Y9Y9YJYJ3#YIYJYJ3#3$YJYWYWYWY9Y9YIYIYIY>Y>Y>2Y2ZX1X)2Z3#X)X)3#X1X)X)Y63#3$YBY6Y63$YBYBYB3$YBYBY63$Y6Y63$Y6Y6Y)3$Y)Y)3$Y.3%Y.Y)Y)Y)3%3%Y.3&Y.YJ3&YWYWYJYJ3&YJY5Y5Y.Y.Y5Y5Y.3%Y.3%Y.Y.3%Y.Y.Y.Y5Y5Y.Y.Y53$Y5Y53$YWYWYWY.Z'Y.Z'Y.3#3$3%3%Z'Y.Y.Z'Z'3%Z'YNYN3%3&YNZ%Z%Z%YNYN3%YNYXYX3%3&YX3&YXYI3&YIYIYIZ'Z%Z'Z'Z'YGZ'YGZ'YGZ'Z'Z%Z%YGYGYGZ%YGYGYG2YYGYG2Y2ZYIYIY>YIY>Y>Y>Y>YPYPYPYP2XYP2XYIYZYZYIYIYZYZYI2WYIYIYZYPYZ2WYPYP2WYPYI2WYIYI2WYPYIYIYPYP2WYIYIYIYPYPYIYIYI2VYZYPYPYPYP2UYPYPYP2U2VX1Y>Y>YPYPYP2UYPYI2UYPYPYPYPYP2UX12UX1YPYPX1X12UX1YPYIYIYIYP2TX1X12TX1X1X1YIYIYI2T2TX12UX12UYIX12VX1X12VX1WLWLVRWLX1X12U2VX1X)X)X)WKWKWKW%W%W%VRW%WKWJWKWKWJWJW%WJ2QW@W@W@WJWJW%WJ2PW@W6W6W@W62PW6VB2PVBUC2P2QUCUC2QVBUCUCUCUC2QUC2QVBUCUCVBVBUCUC2PTGTGTGTNTN2PTYUY2PUYUYTNTNUYTNVD2OTNTNTNTZTN2OTZTZULTZTN2NTNTNUL2NTNTN2NULTNULTNTNTN2NULUL2NTNV@V@TZ2NV@V@2NV@UPUP2NUPUUUP2NUPUUUPUU2NY8YKY8YKY8Y8Y82MY<Y<YKYKYB2LYBYKY0Y02LY02LY0YK2MY02MY0Y02MY)2N2OY0Y02O2P2P2QYK2RY)Y)2R2S2S2TY0Y02T2UY0Y0Y)Y)2U2VY)2VY)2W2W2X2YY.2Y2ZY)3#3#Y.3$Y.3$Y.Y.Y.Y)Y)3$3%3%Y.3&Y.3&3'3(3)Y.Y.3)Y.Y0Y03)3*Y0Y0YKYK3)Y0YK3*Y0YC3*3+Y.Y.YCY.3*3+YKYK3+3,YKYKY.Y.3,Y.3,3-YKYK3-YKYKYKYKYKYK3-YKYKZ)YKYKZ)Z)3,YK3,YK3-3-YK3.YKZ)Z)3.Z)YKZ)YK3.YK3.YK3/3/YO30YOYKYK3031YOYO31YO3132YKYK32Y.333434Z'35Z'35Z'36Z'Y.Y.3637Y.Y.Y.37Y.3738YM3839YMYMY.Y.Y.YMY.38YMYM38YMY.YM38YMYMYMYK38YK3939Y.3:Y.3:3;3<3=3=3>3?Z)3?3@Z)Z)3@3AZ)Z)3AY.3B3CY.Y.Z$Y.3BZ$Z)Z)Y.Y.Y.Z$Z$Z$Z$3A3AYO3BYOZ)Z)YO3BZ)YO3BYO3BYOYOYOZ)Z)3B3C3CYOYOYO3C3DYOYOZ)YO3DYO3D3EY.3FY.Y.Y.3FY.Y.Z$Z$Z$Z$Z$YOZ$Z$YOYOY.3CZ$Z$Y.3C3DZ$YMYMZ$Z$YMZ$Z$Z$YOZ$YOYOZ$Z$YOYOZ$Z$YOYOZ$Z$3?3@YOYAYO3@YAYA3@YAZ$Z$3@Z$Z$Z$Z$YAYO3?3@3A3AYA3B3CYMZ'YMYMZ'Z'3BZ'YMYMZ$YMYMYM3AYMYMYM3A3BZ'Z'YMYM3A3BYMYM3BZ'3C3DYMYM3D3EYMYM3EY/YMYMY/Y/YM3DY/Y/Z'Z'Y/Y/3CZ'Y/Y/Z'Z'Y/Y/Z'Z'Y/Y/Z'Z'Y/Y/Z$3@Z$Z$3@3AZ$Y2Z$Z$Z$3A3AY23BY23BY/Y/Y/3BY/3C3DY/Y/3DY/Y23DY2Y23D3EY2Y23E3FY2Y23FZ$YAYA3F3GYA3H3HY23IY2YAYAYAZ(3HZ(Z(Z(Z(Z(YRZ(Z(Z(YRYRY2Y23FY2Z(Z(YRZ(Y2Z(Z(Z(Z(Z(3D3EZ(Z(Z(3EY/Y/3EY23EY2Y2Y2Y/Y/Y/3E3EY2Y2Y23EY2Y2Y2Y/Y/Y2Y2Y/Y/Y2Y2Y/Y/3C3D3D3E3F3GY23G3HY1Y2Y2Y23HY23HY23I3IY2Y-Y-Y23I3J3KZ(Y-Z(Y-Z(Y-Z(3JY2Y23JY13JY1Y1Y1Y1Y1Y-3JZ'YGZ'3JYGYG3JYGZ'Y?Z'Y?Y?Y?Z'Y?YG3HY?Y?Z'Z'Z'3HZ'Z'Z'Y?Y?Y?Y23GY?Y?Y13GY?Y?3GY?Y?Y?Y1Y1Y?Y?3FY?3FY4Y1Y13FY?Y4Y4Y?Y?Y43F3FY?3GY?Y?Y?3GY?Y43GY4Y4Y43GY43HY4Y43HY43HY?Y1Y13H3I3JY13JY1Y1Y1YGY?Y?Y?3IYGY?Y?YGY?Y?Y?Y?YIY?Y?YIYIY?Y?3FYI3GY?YIYIYI3GY?Y?Y?3GY?Y?YTYTYIY?Y?Y?Y?YIY?3EYI3EZ&Z&YIYI3EYIYSYSZ&YS3D3EYSYS3EYSYSYS3EZ&Z&Z&Y?Y?Y?YI3D3EYIYIYIYI3EYIY?Y?Y?3E3EYIYIYIYI3EZ&Z&YIZ&YIYIZ&Z&YIYIYI3CYSYSZ&YSZ&YSYSYSYSZ&YSYS3AYSZ&Z&WMWM3@X1X1X1Z&Z&Y+Y+3?3@Y+Y+WM3@WMWMX1X13@X1VXVXVXVUVX3?VUVUVX3?VUVU3?VUVUVU3?X+3@X+W6W63@X*W6W63@X*W6W)W)W)3?3@WXWX3@WXWXWXW)W)W)WXWXX/WX3?X/X/3?X/WXWXWX3?UCTYUC3?UC3?UCTYTGTGTYTYTY3>TYTNTZTZTZ3>TZTZTZ3>3>U3U4U3TZTZ3>3?TZTZTZ3?TZV@3?V@TZTZ3?3@TZ3@3AUUTN3ATNU33A3BU3U33BU3U3U33BU3TNU33BU33CU33CU83DU8TNU6TNTNU8U8TN3CTN3CTNTNUUUU3CUU3CUUUUUUU>U>U>3C3C3D3E3FV@UU3FUU3FV@3GV@3G3H3I3JV@V@3J3K3KUUUUUUYD3K3LY@YDYDY@3LYDYD3LY@YDYDY@Y@Y@3KY@3L3LYK3MYDYDYKYDYDY@YDY@YDY@YDY@YDYDYDY@YDYDYD3IYD3I3JYDYD3JYK3KYDYKYK3KYD3K3LYDYDYKYDYDYD3K3LYKYKYKYOYKYKYOYO3KYOYKYKYK3KYOYO3KYO3KYO3LYOYKYKYK3LYKYOYKYK3K3LYOYOZ(YRZ(Z(Z(YRZ(3KYRYR3KYRZ(3KZ(Z(YRYR3K3LYRYLYRYLZ(3KZ(Z(3KYLZ(YLZ(3KYR3L3LY-3MY-YR3MYRYRY-Y-YRY-Y-3LY-3MYLYL3MYYY-Y-3MY-Y-Y-3M3N3NYY3OYYYY3OYYYYY-Y-3OYUY-3OYUYU3OYUYUYUYUYUYYYUYUYU3N3OYUYUY,Y,Y1Y13NY1YV3NYVYV3NY1YVYVYVYVY-Y-Y1Y1YV3MY1Y13MY13M3N3OYVYVYVY,Y,Y1Y1Y13NY1Y13NY1YV3NYVYVYVY1YVYVY1Y1YV3MY1Y13MY1YVYVYV3MY,3MY,3NY,3NY,Y,YIYIYIX%X%X23MX2Y;X2X2X2X2X2Y;3LX2X23L3MX2X23MX2Y;Y;Y;3MX&X&Y;X&X%X%X%W#W#YIW#3KYIYIYIW#X2X23JW#3JW#X&X&3JW#X&X&W#W#3JW#X2X2W#X23IW#X2X&W#X&X&X&W#W#3HW#W#W#3HW#WVWVVW3HWVWV3HWVVWVWX&X&VWVW3GVWWVWV3GWVVWWVVW3G3GWVVWWVVW3GVWVWWV3GWV3HWVWVVW3HWVWV3HWVVW3HVWVW3HWVVWVWVRVRWS3H3HVRVRVRVRVR3H3I3IX$3JX$VRVR3J3KW'W'3K3LW'W'3LW'3L3MW'W'VRVR3M3N3NX$X$X$VRX$X$X$3M3NW/W/X$X$3N3O3O3PX$X$3P3QW/W/X$W/3QW/X$X$X$3QW/3QW/W/3QW/W/W/X$X$3Q3RX$3RX$X$W/3R3S3T3TX$X$3UW/3UW'W'3UW/W'W'W'W'W/W/W/3T3U3V3V3WW'3XW/W/3XW/WVW/3XW/3XW/WVWVW/W/3XW/3XX$X$X$3X3YX$X$X$X$3YX$X$X$X$3Y3YW'X$3ZW'W'3Z4#4#X$4$W'4$4%W'W'W'4%W'W'4%4&W'W'VRVR4&4'VRVR4'4(WXWXWX4(WXWXWXWP4'4(4)WPWX4)WXWP4)WPWPWPWP4)WWWWWPWPWP4)4)4*WWWW4*WWWWWWWX4*WXWXWXWP4*WP4*WXWPWPWXWX4*X.WPWPWP4*WW4*WWWW4*WWWWWW4*V&UCV&UCV&UC4*4*4+UCV&V&V&UCV&UCUCV?V?UCUC4)4*UCUCV?V?4)4*V?V?4*4+4,V&4,TYTYTYV&TYV&TY4+TYV&TY4+U2U2U24+U2U2U2TP4+TPTP4+TY4,TY4,TNTNTNTN4,TNTNTN4,TNU?4,UUU?UUTN4,TNUUTNUU4,UUUUUU4,UUUUUU4,4-TNUU4-UU4-UUTNUUYDYD4-YDYDYDS<S<YDYDYD4,YD4,S<S<S<S<S<4,S<S<S<4,4,4-S<4.S2S24.S24.S2S<S2S2T)S2S2S2T)S2T)S2S2S2T)S2T)T)T)T)T(T)T(4)Y;Y;Y;Y;Y;4)Y;Y,4)Y,Y,4)XXY,XXY;Y;Y;4)W0W04)W04)4*WIWIY;Y;W+W+Y;Y;4)Y;Y;Y;Y;4)W+4)W+W+Y;W+W+W+W+W+4(W+4(WIWIWIW&4(W&W&4(4)W&W&W&W&W&4)W&W&4)W+W9W&W9W9W&4(W9W9W9W9W94(W9W94(4)W94)W94*W&4*4+W+4+W+W9W+4+4,VS4-W+W+4-W+W9W94-4.4.W9W9W9W9W9W9W24-W2W2VSW9VSW94-Y;Y;W+W+4,Y;W+W+Y;Y;Y;4,W+4,W+W+W+VY4,VYY;Y;4,Y;Y;Y;W+4,Y;Y;VYVY4+VYVYVYY;Y;VY4+Y;Y;4+VYX&X&4+X&VYX&VY4+X&X&VYVYX&X&VYX&4)X&VYX&4)X&X&X&VY4)VY4*4*X&4+X&X&X&VYX&4*X&VYVYX&X&VY4*VYX&VYVYVYX&VYVYVYX&VYX&VY4'4(VY4(X&4)X&X&VWX&X&VWVW4(4)VWVW4)4*4*4+X&VWVWVWVWW:VWVWW:W:4)WV4*4+X&W:X&X&4*W/4+4,4,W:W:W:W:W:4,W<W:W:W<W<W:4+W<W<W<W<W:W<W:W:W:4*4*4+W:W:4+4,4-W<W:W<W<W<4,W<W<W<W<4,W<W<W<4,W<W<W?W?4,W?W?W?W<W?4+W?4,W<W?W?4,W?W<W<W<4,W?W?4,W?W<W<W<4,W<4,W<W?W<W?W?W?W<W?W?W?WWWWWWX(TNTN4)TNUJUJUQUJTOTOTO4(TO4(TO4)UJTNUJ4)UJ4)UJUJTNTN4)TNUQUQ4)UN4)4*UJUJTNTNUJ4*UNUQUNUQTNTN4)UJTN4)TNTNS;S;T(S;W9W9S;4(S;4(S;WT4(WTWTWT4(4)WCVY4)WTWTWTWTVZ4)VZ4)VZWTVZVZWQWQWQW.WHW.4(W.4(W.W.W.4(W.WH4(WHWHWH4(W.W.W.4(W.4)WHW:W:4)W<X&W<X&X&W<W<4(W<4(W<X&W<W<W<W<4(W<W?4(W?W?W?W?4(W?4(W?W?W?4(W?W?4(W=W?W=4(WXW=W=W=W=4(W?W?4(W?W,W?4(W?W?W?4(W?W?W,W,W?W,W,W?W,W,W?W?4&W,4&4'W,W,W,W,4'W,W?4'W?W?4'W,W?W,W?W?W,W,W?W?W,W,4%4&4'4(X0WXX04(WXWX4(4)WXWX4)WXWXWX4)4*UKUK4*UNUQUQ4*UNUMTJ4*TJ4*TJTJTJUMTJTJTJTJTJTC4)V:VAV:4)4)4*4+4,V8V8V8T.SC4+SCT$T$T$S?4+WTWT4+WTW,W,W,X04*X-W$W$X-X-W$4*X-X-4*W$X-X-4*4+W$X-4+X-WX4+4,WX4,W44-4.4.U-UNU-T<T<TK4.TUTUTKTU4-TKTFTKV(V(TKTKS6S6S64,S?S?4,S6S6S6S?S?S6S?S?S?S?S?S7S74)4*S0S0S/S04*S0SOT&SOT&SB4)SBSBSMSBSMSB4(SZSZSZSBSZ4(SZSB4(SZSB4(SWSWSWX0W$X0W$TFTFTF4'S/S/SXS/S0SO4&SO4&SO4'SOSOT&SOT&S0SOS0S0SOSO4%4&SO4&4'4(S0SOS0S0T&T&T&4'T&4'T&T&S5S5S54'S5S5S54'SHSHSQSHSQ4&SQSISISI4&SI4&SISQSISQSQSQSISISISI4%4%SY4&SYWAWAW7W7WAWAW7WAWAWA4$4%4%4&W7W74&W(WBWBW(WB4&W(U(U(T/4&U(U(V-U(S9S9SPSPS9S9S9SPSPSLSPSLSL3ZSLSL3ZSL4#4$SLSLSPSP4#4$4%SL4%SI4&SISISISI4&SQ4&4'SKSQ4'SQ4(SK4(SKSK4(S:SQS:SISI4(SKSKSKSK4(4(S:S:4)S@4)S@S@SISYSISYSYSYS@4(SYSY4(SY4(SYS@SYSYS@S@S@WOWF4'WFUGV)V)V)V)4&V)TTV3T/V3V3V-V-4%4&V-V-4&4'4'4(T?T?T?4(T?T?V-U(V-V-U(U(U(4'V-V-UE4'V-V-4'V-SPSQSPSQ4&SQSRSQ4&SQSRSRSQSQSRSQSRSRSR4%SQSQSRSQS@S@SR4$SR4$SRSRS8S84$S84$S8ST4%ST4%STSTS8S84%S8UB4%V1V14%T3T3T7UAUAUA4%TITI4%TITTTTTT4%TITIV3V3TI4$TIV34$SRSFSFSGSFSGSGS84#STS8SF4#SFSFSFSF4#SG4#T3T7T7T24#T2T2T:T:T1T:T:T2T:T2T13YT1T13YT2T1T2T2T2T23YT=T=T23YT23YT2T23YT=T=T=3YTIT=TI3Y3ZT=4#4#V3V3V34#V3V3V3T=4#T2T24#V3V3V3SESE4#SGSESESE4#SESGSGSGSGSG3Z4#SG4#SG4$SGSVSVSVX>X>X>XF3Z4#XFXFT5T54#T54#4$T7T74$T5T74%T5T54%T5T94%T9T9T2T24%T2T9T2T9T24$4%T0T04%T2T0T0T24%T0T04%V34&URT2URT2URV3V34%4&T2UR4&UR4&URURURT2T2T24&T24&T2T24&T2T04'T2T2T2URURUR4&URV3V34&4'V3V34'V3T2T2T0T04&URT0UR4&SUSGSUX?X?XFX?XFXF4%XFX=XDX=XDXD4$XDXDXFXF4$4%4%XDXDXDT74%T7T7X=XDX=XD4$4%T6T64%4&T6T6T64&T6T6YW4&YWYW4&4'YW4(Y9Y94(Y94(4)Y9Y9YJYIYIYIYJYJYIYIYJYJYIYIX14&X1X14&X1X)X)X1X14&4'X1X1X)X)X1X1X)4&Y64&YBYBY64&YBYBY64&YBYBYBYB4&YBY64&Y6Y6YBYB4&YBY)4&Y)Y)Y.Y.Y)Y.Y)Y.Y)Y.4$Y)Y.Y.Y)Y.4$Y.4$Y.Y.Y.YJYWYWYWYJYJ4#4$Y5Y5Y54$Y.4$Y.Y.4$Y.Y.Y.YWYWY54$Y5YWY5Y5Y.Z'Y.Z'Y.Y.Y.3Z3ZZ'4#Z'4#Z'Y.Y.Z'Z'4#Z'4#4$Z%Z%YNYNZ%Z%YNYNZ%Z%YN3ZYNYN3ZYX4#YXYXYIYXYXYIYI3ZYIYGYIYGYGY>Y>YIYIY>Y>YIYIY>YPY>Y>YIYIYIYZYZYZYIYZYZYPYZYZYPYP3SYPYIY>YIYIY>Y>YIYIYPYIYIYIYIYIYIYPYZYPYPYPYPX13NX1YP3NYPX1YPYPYP3NYPYP3N3OYPYP3O3P3PX1YPYPX1X13PX13PX1X1X1YI3PYIYIYI3PYI3QYIYI3QX13QX1X1X13Q3RYIYI3RYIX1X13RX1WRWRX13RX1X13R3SX)X)3S3TW@W@W@W@W@3T3TW6W6W6VBVBVB3TVBVB3TVBVBVBVB3TVBVB3TVBVBUCVBUCVBVB3S3TUCTGTGTGTYTNTYTYUY3RUYUYVDVD3R3SULUL3SULULULTNTNTZTZULUL3QUL3RTNTN3RTNTNULUL3RTNV@V@TZTZV@V@3QTZUPUP3Q3RUUUUUU3RUP3RUUUUY8Y8Y8Y<YBYBYBYKYKY0YK3PYK3PYKYKYKY0YKYKY0Y)Y0Y0Y)Y)3NY)Y0Y)Y0Y03MY0Y0Y0Y03M3N3O3O3PYK3QY03QYKYKY0Y03Q3RYK3RYKYK3RY)Y0Y03R3SY0Y0Y)Y)3S3T3TY)Y0Y03TY)Y03UY)Y)3U3V3V3WY0Y03W3XY0Y0Y)Y)Y)3X3X3YY)3ZY)Y)3Z4#Y)Y)4#Y.Y.Y.4#Y.Y)4#Y)Y)Y)4#Y)Y)4#4$4%Y.4%Y.Y.Y.4%Y.Y.Y.Y)4%4&4'Y)Y)4'4(Y)4(Y)4)4)4*4+4,4,Y.4-Y.Y04-4.4/4/Y.Y)404041Y0Y0Y)41Y0Y0Y.Y.41Y.YK41YKYK4142YKYK4243YKY0Y0Y0YKYKY0YCY042YCYC42YCY042434444YC4546YCYC46YC46Y.47Y.Y.Y.4748YK48YKYK4849YKYK49Y.YKYKYKYKYKZ)Z)Z)Z)48YKYKYK48YK48YKYK48494:4;4;YKYKYKZ)Z)4;4<Z)Z)YKYKYK4;YOYOYKYOYK4;4;YOYOYOYOYO4;YOYK4;4<YOYKYOYOYO4;YOYOYOY.Y.YKYKY.Y.YK4:Y.Y.4:Y.YK4:4;4<4<Y.Y.Y.4<Z'4=Z'Y.4=Y.4>Y.4>4?Z'Y.4?Y.Y.Y.Y.YMYMY.YM4>YMY.Y.Y.4>4>4?YMYM4?YMYMYM4?Y.4@Y.Y.4@4A4BY.Y.Y.YMYMYMY.Y.Y.YMYMYM4?4@4AY.4AY.Y.Y.YKY.4AY.4AY.4BY.4BY.4C4DY.Y.4DY.4D4EZ)Z)4E4FZ)Z)Y.Y.Y.4FY.Y.4FY.4FZ)Z)Z)Z)4FZ)4G4G4HZ)4IY.Y.4IZ)Y.Y.4IZ)Y.Y.4IY.Z)4IZ)Z)4IZ$4JZ$Z)4JZ)4KZ$Z$4KYOZ)Z)Z)YO4JYOYOYO4J4KYOZ)Z)4K4LYO4L4MYOYOZ)4MZ)Z)4MYOYOYO4MZ)YOYOYOZ)YOYOYOYO4LYO4L4MYOYOY.4MY.4N4N4OZ$Z$Z$Z$4OZ$Y.Z$Z$Z$4NZ$Y.Y.Y.Y.4N4OY.Y.Y.4OZ$Z$YOYAZ$Z$YA4NYO4NYO4OYAYA4OYAZ$Z$4OZ$YO4OYOYOYOYOYOZ(YOYOZ(4N4NYA4O4PYO4PYAYA4PYAYAYAZ'Z'YMYMYMYM4OYMYMYM4O4PYMYM4PYMZ'Z'4P4QZ'Z'YM4QZ'Z'4Q4RYM4RYMYM4RZ'4S4TYMYMYM4T4TYM4U4VYMYMY/Y/YMY/4UY/Z'Z'Y/Y/Z$4TZ$Z$4T4U4V4W4WZ$Y2Y2Z$4W4XY2Z$Y2Y2Y2Z$Y2Y2Y24VY/Z$Y/4VY/Z$4WZ$4WZ$4X4X4YY2Y2Y/Y/Y24Y4Y4ZY2Y2Y/4ZY2Y24Z5#Y2Y25#5$Y2Y25$5%Y2Y2Z$Z$Z$5%Z$YA5%YAYAY2YAYAYAYAYAZ(Y2Y25#Y25#Y2Z(Z(YA5#Z(Z(Y2Y25#Y2Z(5#Z(YR5#Z(YRYRZ(Z(YR5#Y2Y25#Y2Y/Y/5#Y/Y/Y2Y2Y2Y/Y/4ZY24Z5#Y2Y2Y2Y/Y2Y2Y/Y/Y2Y2Y/4YY/4Z4ZY?Y?Y?4Z5#5$Y2Y?Y?5$Y?Y2Y15$Y1Y25$Y2Y1Y2Y2Y2Y-Y2Y2Y25#5#Y-Y-Y-Y2Y25#Y2Y2Y25#Y2Y-Y1Y-5#Y1Y15#Y1Z(Z(Z(Y-Y24ZY2Y2Y2Y1Y1Y1Y-Y14YY1Z'YGZ'Z'YGYGZ'4XYGYG4X4YZ'Z'Z'Y?Y2Y?4XY1Y14XY1Y14XY?Y1Y14X4YY4Y4Y4Y4Y14YY44YY44ZY4Y?Y4Y4Y4Y?Y4Y?Y4Y?Y4Y4Y4Y?4W4XY44XY4Y4Y44XY44YY44YY4Y4Y4Y4Y44YY14YY1Y1Y?Y?Y?4YY?Y?4YY1Y14YY1Y1Y?4YY1Y1YGYGY?Y?YIYI4XYIY?4XY?Y?4X4YY?Y?Y?YTYTYT4XYIY?YIYIYIZ&Z&YIYI4WYIYIYIYSYSYIYIYSYSYIYIYSYI4TZ&Z&Z&Y?Y?YIYIY?YIYIYI4RYI4S4TY?Y?Y?4TY?YI4TYIYIYI4TYIYIYIYSYSYSYS4SYSYPX1X1X1Z&Z&Y+Y+4QY+Y+Y+X14QWMWMX1X1X14QVXVXVU4QVXVXVUVUVXVX4PVUX+X+4PX+4PX+X+X+X*4PX*X*4PX*X*X*WX4PWXWX4P4QWXWXW)W)4Q4RWXX/WX4RX/X/4RX/WXX.X.X.UCTY4QTY4QTYUCTYTNTNTY4QTZTZ4QTZTZTZTZ4QTN4QTNTNTZTZ4QTZTZTZ4QTZTZ4Q4RV@4R4SV@V@TZTZTZ4STZTZ4S4T4TV@TZV@TZTZ4TUU4TU44UU9U44UU9U94UU3U3U34UU3U3U3TNU3TNU3TNU3TNU3TNU3TNU3TNU8TN4R4RU8U8TNTNU7TN4RTN4RTNTNUUUU4RUU4RUUUUUUU>U>U>UUU>4QU>U>UUUU4QUUU>U>UUUUU>UUUUUUV@UUV@4O4OV@4PV@4PV@4QV@V@4QV@V@UUUU4QUUV@V@UUUU4PUUUUUUV@V@V@4PV@V@4PUU4PUUUUUUYDYD4PY@4PY@Y@Y@YDYDY@Y@YDYDY@Y@YDYD4NYD4NYDYDYDYDYK4NYK4N4OYDYDYDYD4OYDY*4OY*Y*4OYKYDYKYKYK4O4P4PYKYDYDYDYKYDYDYKYK4O4PYKYK4P4QYK4QYKYKYOYOYKYKYO4PYKYKYK4PYKYKYOYOYKYKYKYO4OYO4OYOYKYOYKYKYKYOYO4NYO4O4OYO4PYOYRYRZ(YRYRYRZ(YR4NYRZ(YRZ(YRZ(Z(YRYR4MYRZ(4MZ(Z(Z(YRZ(4MZ(Y-YRYRYRYRYR4LY-Y-YRY-4KY-Y-Y-YR4KYRY-Y-Y-Y-YVY-YVY-Y-YLYLYLYYYLY-Y-Y-YYY-YYYYY-Y-YYY-YLYYYLYYYLYYYLYYYYYU4C4DY-Y-YU4DY-YUYUYUYUY-YUYUYUYUY,Y,YUYUY,Y,4@Y14A4BYV4BYVY14BY1Y1Y1Y1Y1YV4BY1Y14BY1Y1Y1Y14BY1Y14BYVY14BYVYVY1Y1Y14BY1Y14BY1YV4BYVYVY1Y1YVYVY1Y1YVYVYVY;Y;Y;4?Y;4@Y;Y,Y;Y;Y;Y,4?Y,4@X2X2Y;X2Y;4?Y;Y;4?Y;Y;Y;Y;X2Y;Y;X2X24>X2Y;X&4>4?W#YIW#W#W#W#4>W#W#W#4>4?4?W#X&X&W#W#4?4@X2W#4@W#W#W#X&X&W#W#4?W#4?WVVWVWWVWVVWVWVWVW4>VW4>WV4?WVWVWVVW4?4?WVVWWVVWWVVW4?WVWVWVX$WV4>WVWVWVWVVWVWWVWVVW4=VW4=VW4>WVWV4>WVVRVR4>4?WSVRVRVRVR4>VR4?4?4@X$X$VRVRVR4@4@X$X$X$VRVRW'W'VRVRW'W'W'W'W'4>W'W'4>4?W'W'X$4?W'4?W'W'VRVR4?4@VRX$VRX$4?X$X$X$4?X$X$X$X$X$X$4?X$X$4?X$4?4@W/W/4@4AW/W/X$X$4A4BX$4BW/W/4B4CW/W/4C4DW/W/X$W/W/W/X$X$X$W/X$4BW/W/4BW/W/W/X$W/W/W/X$X$W/X$4@4AX$X$W/4A4B4CW/X$4C4DX$X$4DX$4DX$X$X$X$X$4D4EW/W/4E4FW/W/W'W'X$X$4E4FW'4FW'W'4FW'W'W'4FX$4GW'4GW'4HW'4H4I4J4KW/W/WVWVWVW/WVW/4I4JWVWVW/W/W/4JW'4JX$X$X$4JX$X$W'4J4K4LX$X$4LX$X$4L4MW'W'W'W'4M4M4NX$X$W'W'4N4OW'W'4O4PX$X$X$4P4PX$W'W'X$4P4QW'4Q4RW'W'4R4SW'4TX$4T4UW'4UW'W'W'W'4UW'W'4UW'W'W'W'4UW'W'4UW'W'W'WXWX4U4VWXWXWX4VWXWP4VWPWX4VWPWPWX4VWXWPWXWX4VWPWPWPWW4VWP4VWWWWWP4V4W4XWPWPWWWWWPWW4W4XWXX.WX4XWX4XWPWPWXWX4XWPWXWXWXX.WPWP4WWWWP4WWWWWWP4W4XWWUCV&UCV&V&V&4WV&UC4WUCUC4WV&V&V&4W4XV?V?4XV?V?V?UCUCV?4XUCUC4X4YUC4YV?V&4YV&V&V&4YV&U2U24Y4Z5#5$V&TYV&TY5#5$U2U25$5%U2U25%5&TP5'TYTY5'TY5'TYTPTP5'TNTYTNUUUUTNUUTNTNU?U?U?UUU?U?TN5$UUUUTNUUUUUUTNUU5#UUTNUUTNTNUUUU4ZUUTNTNTN4ZTN4ZTNTN4ZYDY@YDYDYD4ZYDS=S=4ZS=S<S<4ZS<4Z5#S<S<S<S2S<5#S2S25#S2S<S2S<S<S2S24ZS24ZS2S<S2Y;Y;Y,Y,Y;Y;Y,Y,Y,Y;Y,Y,4WY,Y,Y,Y;Y;Y;Y,W0W04V4WWI4WWIWIW0W0WIWIY;Y;4VW+Y;4VW+W+Y;Y;W+Y;4UW+W+W+W04UWIWI4U4VW&W&4V4WW&W&4W4XW&W+W&W&W&4XW&W&4XW+W&4XW&W9W9W9W9W24W4XW2W2W9W9W9VSW9W24WW2W9W2W9W9W&W+W&W+W&W&4U4VW94VW9W9W9W+VSVSW+W+VS4UVS4UVSVS4U4VVSVSXX4VW1W14VW94WW9W14WS;W9W9W24WW24WVS4XVSY;Y;Y;W+Y;Y;W+4WW+W+W+4WW+4WVYVYY;Y;4WY;Y;4WVYVYW+VYW+VYVY4VVYVY4VVYVYVY4VX&4WX&X&X&VYX&VYX&VYX&VYVY4U4VVYVYVY4VVY4VVYVYVYX&4VX&4VX&VYX&VYVYVY4V4V4WVYVY4W4XVY4YVYVY4YVYX&X&4YX&VYX&VY4YVWVWX&4YVWVW4YX&VWVWX&4YVWVW4YVWX&4YX&X&4YVWVWVWWVWVW:WVW:4XW:W:4XW:W:W:W/W/4XW/W:4XW:W:4XW/4YW:W:W:4YW:4YW<4ZW<4ZW<5#W<W:W<W:W<W:4ZW:W:4ZW<W:W<W:W:W:4ZW:W:W:4ZW:4Z5#5$5$W<5%W<W<W?W<5%W<5%W<W<W<W?5%W?W<W?W<W?W<W?W<W<5#W?W<W?W<5#W<5$W?W?5$W?W<W<5$5%5%W?W<W?TNTN5%5&TOTOUQTOUQUQ5%UQ5%UQTOUQ5%TN5&TN5&TN5'5(TNTNUJTNUN5'UNUN5'TNUJ5(TNTN5(TNUJ5(UJ5)TNTN5)UJTN5)TNUUW9VS5)VSS;S;S;WT5(WTWTWTVY5(WCVY5(X&VYVYWC5(WTWTWTWTWTVZWTVZWTVZW.WHW.WHW.WHW.5%W.5%W.5&5&WH5'WHWHWH5'W.5'W.W.W.W.W.W.WHX&W<X&W<W<W<5%W<5%W<X&X&W<W<W<W?W<W<W<W?W?W?W?5#W?5#W?W=W?W=W?5#W=W=5#W=WXWXW=5#5#5$W?W?W?W?W,W?W?W?W?W,W,W,W?W,W?W?W,W?W?W?W,W,W?W,W,W,W,W,W?W?W?4UW?W?4UW,W?W,W,W,W,4U4UW?4VW?W,4VW,W,4VW?4WW?WXWX4W4XWXWXWX4XWXWX4X4YWXWX4YWXWXWX4YX#4YWXX#WXT@T@T@4Y4Y4ZUNUNUMTJUMTJUMTJUMTJ4XTJTCTCVAVAV:V:T-T-T-4WT-T-4WUHUHUDUDUD4VV6V6V6SCT$4VT$T$T$S?S?WTWTWTVQX0X04TX0X-4TW$4UX-4U4VW$W$4VW$4WX-X-4WX-W$4WW$W$WX4WWXWX4W4X4Y4Z4ZW4W4W4W4W4WXWXW4W4WXWXUNUNUNU-T<T<TKTKTF4VTF4WS6S64WS6S?S6S6S6T%T%S0S0T%T%S0S0S/S/S/S0SB4SSBSB4SSZ4TSZSB4TSBSB4T4USBSBSASASASWTFTK4TTKS0SOS0SOS0SOS0SOS0SOS0S04QSOS04RSOSO4RSO4RT&SOT&SO4RSOSO4RT&T&T&T&4RT&4ST&4ST&4T4T4USLSLS5S54U4VSQ4VSQSISISI4VSISQ4VSQSQSI4VSISYSISISISY4USYSYSYWAWA4U4VWAWA4V4W4WWYWYWYWYWY4W4XWBW(WBWBW(4WWBWB4WU(4XU(SLS94XS9SPSPSLSLSLSLSPSLSLSLSLSPS94US94V4V4WSLSLS9SLSLSLSQSI4V4W4WSISQSISISISKSISQSQ4VSKSQ4VSQSKSQSK4VSK4VSKSQSQSKSKSKS:SQ4USQS:SISISI4USKS@SKS@4T4US:S:S:4US:S:4US@S@S@SYSYS@4USYSY4USYS@S@4USYWOWFWFWFV)4TV)TTT?V-V-V-V-V-4SV-T?V-T?4SV-UEUEUEV-4RT?T?4RT?T?T?4RUET?T?U(V-V-V-V-V-UEUEV-V-UEUE4OSQSRSRSQSRSRSRSR4NSRSRS@S@SR4N4NSRSRSRS8S84NS84NS8STS8S8S8ST4NST4NSTST4NS84O4PUBV1V1V14OUAT3T3UA4OTITITITI4OTITTTT4OTTTITITI4O4OSRSFSRS8S8S84OSFSFSF4O4OSGSGSGT3T3T7T3T2T=T2T2T14MT1T14MT2T1T2T2T2T24MT2T=T24MT24MT2T24MT=4NT=4NTIT=TIT=T=T=4NV3V34NV34NV3T2T2T24NT2V3T2T24N4OT=T=4O4PT24PV3V3SESESESGSESESE4OSG4OSUSU4OSUSUSUSGSG4OSU4OSUSUSUX>4OXFXF4OXFXFXFT5T5T7T5T74NT7T7T5T54NT7T5T5T74N4N4OT7T7T5T54OT7T2T2T9T2T2T24N4OT24OT2T04O4PT04QT2T2T0T04PT0T0T0T2T24PV34PURURURURV3UR4PV3V34PV3T2T2T24P4PURT2URT24PT2T2T24PT24QT2T24QT2T2T2T04QURUR4QURV3V3V34QV3V34QV34QURURURURURT04QSGSUSG4QXFXF4Q4RXD4RXDXDXFXF4R4SXFXF4SXDXD4SXDXD4ST0T7T74S4TT6T6T1T1T6T6T14ST6T64ST1T6T6T14ST6T6YWY9YW4SY9Y9YWYWY9Y94RY9YW4RYWYW4RY9YWYWYWYWYWY9YW4QY9Y9X1X1X14QX1X14Q4RX)4RX)X)4RX)X)X)4R4SX)X)Y6Y64S4T4T4U4VYB4V4WYBYBYBYB4W4X4XY6Y6Y6YBYB4X4YY.Y.4YY.Y)Y)Y.Y.4XY.4YY.4YY.4ZY.YJYJ4Z5#YJYJ5#YJY5Y5Y.Y.Y54ZY.Y.4ZY.Y.Y.YWYWY54ZY.Y.Y.Z'Y.Z'Y.Z'4XZ'Z'Z'Y.Z'Y.4XY.4XY.Z'YNYNZ%Z%YNYNZ%4WYX4WYNYNYXYX4WYX4WYNYNYN4W4X4YYI4Y4ZYZYPYPX1X1X1YP4YYPX1YPYPYP4YYPYP4Y4ZYPYP4ZYPYPYP4Z5#5#X15$X1X1X1YPYPX1X15#X1YPYP5#X15#5$YIYIYIYIYI5$YI5$YIX1YIYIYI5$5$X1X1X1YI5$X1X1YIYIX1YIYIYIX15#X1X1WR5#X1X1X1X)4Z5#X)X)5#X)X)X)WJWJW@5#5#WJW@W@W65#W6W6W@W@W@W6VBVBVB4ZVBVB4ZVBVBVBVB4ZVBVB4Z5#VBVBVB5#VBVB5#VB5#TNUY5$5$5%VDTN5%TNTNTN5%UL5&5'ULUL5'UL5'5(TNTNTNULTN5(5(TNTNTN5(5)TZTZUPUPUP5)UPUP5)UPUUUPUUUPUPUP5(UPY0Y0YK5(YK5(YKYKY0Y)Y05(Y)Y)Y0Y0Y0Y05'5(5(5)YKYK5)YKYKYKY0Y05)5*Y0Y05*Y05*5+YK5,Y0Y0Y05,5,5-YKYK5-Y05.Y05.Y0YKYKY)Y)5.Y)Y)Y)5.5/5/50Y0Y0Y)Y)5051Y)Y05152Y)Y)Y0Y)Y)Y)Y)Y0Y0Y)Y0Y05/Y0Y0Y0Y0Y)Y05/Y05/Y0Y0Y)Y)5/Y0Y)5/Y0Y05/Y)5051Y)Y)Y.Y.Y)50Y)Y)Y.Y.Y)Y.Y)5/Y)Y)Y)5/Y.Y.5/50Y.Y.Y)Y)Y.Y.Y.Y.5/Y.Y)Y.Y)Y)Y.5.Y)5/Y)Y)Y)5/Y)5/50Y.Y)Y.Y.Y.Y.Y.5/Y.5/Y.Y.Y.Y)5/Y)Y)5/50Y.Y.50Y.Y.Y.50Y0Y0Y0Y)50Y051Y)Y)Y)51Y)51Y)52Y)52Y)Y)Y.Y.52Y.Y)Y)Y)52Y.Y.52Y.5253Y.Y.53Y.54Y.54Y)55Y)Y055565757Y)Y)Y)57Y)5859595:Y)5;5;5<Y05=Y)Y)5=Y)5=5>Y)Y.Y.Y.Y0Y.Y0Y0YKYKY0Y0YK5<Y0Y05<Y0Y05<YKYKYKY0YKY0Y0YCY05;YCYC5;YCY0Y0Y05;YK5;YKYK5;5<YKYK5<YCYCYCYCYC5<5=YCYCYC5=YCYC5=YKYCYC5=5>5>Y.YCY.YK5>YK5?Y.Y.5?Y.5?Y.YKYK5?5@5AYK5A5BYKYKY.Y.5B5CZ)Z)YKYKYK5BZ)Z)Z)5BYKYK5B5C5DZ)5D5EYKYK5EZ)Z)5FZ)YK5F5G5G5HYKYKZ)Z)YKYKZ)Z)YKYKYKYKYOYOYKYOYK5EZ)Z)YOYOYOYO5DYOYKYK5D5EYKYOYKYK5DYOYOYOY.5DYKYKY.Y.5DY.YK5D5E5FYKYK5FY.5FY.Y.Y.5FY.Y.Y.Y.Z'5FZ'5FZ'5GZ'Y.Z'5GZ'5GZ'Y.Y.Y.5GY.5HY.Y.Y.Z'5GZ'5HZ'5HYMYMYMY.Y.Y.5HY.Y.YMYMY.Y.YMYMY.YMYMYMY.Y.5EY.YMY.YMYMY.5D5EZ'Y.5EY.5F5FZ'Z'Z'YKYKYK5FYK5F5GY.YK5GYK5H5H5I5JY.YKYKYK5JYK5JYKYKYKY.5JY.5JY.YKY.5JY.YK5KY.Y.5KY.Y.Y.Y.5K5KZ)Z)Z)5K5LZ)Z)5L5MZ)Z)Z)5MZ)Z)Y.Y.Y.5MY.Y.5MY.5M5NZ)Z)Z)Y.Z)Z)5MZ)Z)Z)Y.Y.5MY.Y.Y.5MY.Z)Y.Z)Z)Y.Z)Z)Z)5K5LZ)Z)Y.Y.Z)Y.Y.Y.Z)5KY.Y.Z$Z$5JZ$5KZ$Z)Z$Z)5K5KZ$5LZ#Z$Z$Z$YOZ)Z)Z)YOZ)Z)YOYOZ)Z)YOZ)Z)Z)Z)YOZ)Z)Z)5G5GZ)5H5IZ)YO5IYOZ)Z)Z)5I5IYO5JYOYO5JYOYOZ)5JYOYOZ)Z)Z)5JZ)YO5JYOY.Y.Y.5J5JZ$Z$Z$Y.Y.Z$Z$5IZ$Z$Z$Y.Z$Y.5IY.5IY.Z$Y.Y.Y.5IY.Y.5IZ$Y.Y.Y.Z$YAZ$YAYAYOYOYOYA5FYA5G5HYAYA5HYAZ$Z$YAYAYOYOYO5GYAYAZ(5G5GYAYAYA5G5HYOYOYAYA5H5IYOYO5IYO5IYA5J5KYMYMZ$YMYMYMYMZ$YMYMZ$5IYMYM5IYMZ'Z'YMYMZ'YMYMYMZ'Z'YM5GZ'Z'5G5HZ'Z'5HZ'YM5HYMYM5HZ'YM5IYM5IYMYMZ'Z'5IZ'YMYMYMY/YMYMYM5H5HY/Y/Y/5HY/Y/Y/YMY/Y/Y/YM5GZ$Z$Z$Z$Z$5GZ$Z$5GY2Z$Y2Z$Z$Y2Y2Z$Z$Z$Z$5EZ$Z$Z$5EZ$Z$5EY2Y25EYMZ$YMZ$5EZ$5F5F5GZ$5HZ$5HZ$5IZ$5IZ$Y25IY/Y2Y2Y/Y/Y2Y2Y/Y/Y25HY25HY2Y2Y/Y/Y2Y2Y/Y/Y2Y2Y/Y/Y25FY/Y/5F5GY/Y/5G5HY/5HY2Y25HY/Y2Y25H5IY2Y2Z$5IYAYAZ$5I5J5KY2Y25KY25KY2YAYAYAYAYA5KY2Y25KY2Z(Z(5K5LZ(Z(5LZ(5LZ(YR5MY2Y25MY2Y/Y/5M5NY25NY2Y2Y/Y2Y2Y25MY2Y2Y2Y/Y/Y/5MY/Y?Y?Y?Y/Y?5LY?Y/Y/Y/5LY?Y?5L5M5M5NY2Y2Y?Y?Y2Y?Y2Y1Y1Y1Y2Y1Y1Y1Y2Y2Y25KY25KY-Y-Y2Y25KY2Y2Y2Y25KY-Y1Y-Y-Y1Y15J5KY25KY2Y1Y-Y-Y-Y15JYGZ'5KY?5KY?Y?5KY?Y?Y?Y2Y1Y1Y1Y?Y?Y15JY?Y?5JY1Y?Y?Y4Y4Y?Y?5IY?5IY4Y1Y4Y?Y?Y4Y4Y45HY4Y4Y4Y?Y4Y4Y?Y?Y4Y?5FY?5GY?Y?Y?Y45GY45GY45HY45HY4Y?Y4Y4Y?Y?5GY?5HY?Y?5HY?Y15HY?Y1Y15HY1Y1Y1Y?5HY1Y1YIYIY?5H5HYIY?YIYIYIY?Y?YIYIY?Y?YIYI5F5GYIYIZ&Z&YSZ&Z&Z&YIYIY?5EY?5E5F5GYIYI5GYIY?YIYIYIY?YI5FYIYIYIYI5FYSYSZ&Z&Z&Z&5EY+X1X1WMWMX1X1VVVVVX5CVUVU5CVUVUVUVRX+VR5C5C5DX+X+5DW6X*X*W65D5E5FW)W)WXWXW)W)WX5EW)W)5EW)WXW)WXWXW)W)WXWXWX5CWXWX5C5DWXWXUCUCUC5D5D5EUCUC5ETNTNTNTZTZ5E5FTZTZ5F5GTN5GTN5HTZTZ5H5ITZTZ5I5JTZTZ5J5KTZ5KTZ5LTZTZ5LV@TZV@V@V@TZTZTZ5KTZTZ5K5LTZTZ5L5MTZ5MTZ5NTZTZ5NUUU4U45N5O5OU9U9U9U4U4U95O5OU35PU35P5QU3U3TNU85QU8TNU8U8U8TNU7TNU7TN5OTNTNU3UU5OUU5OUUU3UUU>UUU>5O5OUUU>U>5OUU5PUUTZTZTZ5PTZ5P5QV@5QV@5RV@5RV@V@V@5RUUV@V@5RUUV@5SV@UUUUUUV@V@V@5RV@UU5RUUUU5RUUUU5R5SY@Y@YD5S5TY@Y@Y@Y@5T5TYDYDYDYDYDYD5TYD5TYDYD5TYKYDYDY@YD5TYDY*5TY*Y*YKYKY*Y*YK5S5T5UYKYK5UYKYD5UYDYDYKYK5U5VYKYKYDYDYKYK5U5VYKYK5VYKYKYOYKYOYOYO5UYOYKYK5U5VYKYO5VYO5VYOYKYOYOYOYO5VYO5VYOYOYOYO5V5W5W5XYOYO5X5YZ(5Z5ZYRZ(6#6#YRZ(Z(6#YLZ(6$YRYRYR6$YRYRYRY-YRY-YRY-YY5ZYY6#6#YUYUYUY-Y-YUYUY1Y15ZY1Y-5ZY-Y-5Z6#Y-Y-YVYV6#Y1YVY1Y1Y1YVY1YVYVY1Y15Y5ZY1Y15Z6#6#YVYVYV6#YVYVYVY1Y1Y16#Y1Y1YV6#6#YVYVYV6#Y;6$Y;Y,6$Y,6%Y,Y;Y,Y;6$Y;Y,Y;X2X2Y;Y;X2X2Y;Y;X2X2Y;X2Y;Y;5Y5ZX&X&5ZX&W#W#5ZW#W#W#X&X&5YW#X&X&X&5YX&X&W#W#X&X&W#W#5X5YX2X25YW#W#W#5Y5ZWVWVVWVWX&VWX&X&5XWVVWVWVWVWVWWVWVWVVWWV5VWV5WWVVWWVVWVWWVWV5VW/5VWVVW5WWVWV5WWVVW5WVWVW5WWVVWVWWS5WWSWSVRVRWS5WVRVRVR5WX$5WX$X$5W5X5YX$5Y5ZX$X$VRX$X$X$5Y5ZX$X$W'W'W'5ZW'W'5Z6#6#X$X$X$6#W'X$W'VRVR6#6$W'6$W'W'VRVRW'W'6#6$X$X$VRVRX$X$X$X$X$6#X$X$6#W/W/6#W/W/X$X$W/W/X$X$W/W/X$X$W/W/X$5XX$5Y5YW/W/W/X$X$X$5YX$X$5YX$X$X$W/5YX$5Y5Z6#6#W/6$W/X$X$X$6$X$X$W/W/W'W'X$6#W'W'6#X$W/W/W/6#W/6#W/X$6#6$X$X$W/X$W/W/X$X$6#6$X$X$6$X$6$X$X$X$X$X$X$6$X$X$X$6$W/6$W'W'6$6%W'W'W/6%W/W/6%6&6'W'W'W/W'6'W/6'6(6)X$X$6)X$6)W'W'W'6)W'6*W'6*W'X$W'X$X$W'6*W'W'6*W'W'6*W'W'X$W'W'W'WV6)WVWV6)W/WVWVW/6)W:W:W'6)W'X$6)W'X$W'W'W'6)6*X$6*X$X$6*6+X$X$X$X$6+X$X$X$X$W'X$X$6*6+W'W'6+6,X$6,X$X$W'W'6,W'W'6,X$X$6,W'X$X$W'W'6,6-W'W'X$X$X$X$X$W'X$X$W'6+X$X$6+6,X$6,6-6.6.6/W'W'6/X$W'W'6/X$W'6060X$61W'W'61W'W'X$X$W'W'60W'W'W'6061W'W'W'61W'W'6162W'W'VRVR6263VRW'63W'WX63WXWP63WXWPWPWX6364WP64WPWPWP64WP65WPWXWPWXWPWX64WPWP64WPWW6565WW66WWWPWPWP66WP66WWWW66WWWWWWWP66676868WWWWWWWXX.WXX.WXWXWX6767WPWPWPWP67WPWPWPWP67WPWPWP67WWWW67WWWW67V&68V&UC68UC6969V&V&V&UC69V?V?696:V?V?6:6;V?V?UC6;V?V?6;6<V?V?6<6=V?V?UCUC6=6>UCV&6>V&6>V&6?6@TYTYV&V&TYTY6?TYV&6?TYTY6?TYTYTYV&V&U26?V&V&6?6@V&V&U26@V&V&6@U2TYTY6@6ATYTY6ATY6A6BTPTP6BTYTP6CTP6CTPTPTYTNTYTNTNUUTNUUTNUUTNUUUUUUUU6@TNTNTN6@TNUUTNUUY@6?Y@6@YDYDY7Y7S=S=6?S=S<6?S<S<S<S<S<6?S<S=6?S<S<6?S<S<S2S26?S2S<S2S<S<S<S2S<S2Y;Y,Y,Y,W0W06<6=W0W06=W06=W0WIWI6=6>W+W+Y;Y;Y;6>Y;Y;6>Y;6>W0WI6?W+W+W&W&6>W+W&W&6>W+W&W&W+W+W&W&W&W+W&6=6=W+6>W+W&W&6>W+W&W+W+W+W&W96=W9W9W9W2W2W9W9W2W96;W9W9W9W&W&W&W9W&W+W9W+696:W96;W+W+6;6<VS6<VSVSW+W+VSVSW+W+VSW+XXW9XXW169W9W1W169W9W9W969W9W1W9696:W2W2W9VS6:VS6:VSVSVSY;Y;W+6:W+VYW+6:W+6:VYVYY;Y;6:W+Y;Y;6:VYVY6:VYVY6:Y;VYVYX&X&VYX&VYX&VYX&VY68VYX&68X&X&X&VYVYVY68VY68VYVY68X&X&X&68X&VYX&VY68VY69X&X&69X&X&X&696:VY6:VYVYX&X&6:X&6:6;VYVYVYVYWC6;6;X&VY6<X&X&6<X&VWVWX&X&VWVWX&X&VW6:X&6;VWVW6;VWX&6;X&X&6;VWVWVW6;6<W:6=WVWV6=W:W/W/W:6=6=6>W:6?W/W/6?W/6?6@W:W:6@W:6AW:6AW<6B6CW:6CW:W:W:W:W:6CW:W<W<W<W:6BW:W:6B6CW:6DW:W:W:W<6CW:W<W<6CW<W<W<W:W:W:6CW<W<6CW<W<W<6CW<W:W<W:W<W<W?W<W<W<6AW<W<W<W<6A6B6BW?W<W?W<6BW<W<W<W<6B6C6CW?W?W?W<W<W<6CW<W<6CW?W<6CW<W?V#TNV#V#TNTN6BTNTOUQ6BUQUQUQ6BUQTNTN6BTN6BTNUJUJTN6BUJ6CUJ6CUJUJ6CTN6DTNUNUQUNUNTNTNUJ6C6CTNUJUJTNTNUJUJTNTN6B6CUJ6CUJUJ6CTNUJUJ6CTN6DUUW9VSW9VSS;WTS;WTVY6BVYVY6BX&VYVYWCWTWTWTW.WHW.W.W.W.W.6@W.6@W.W.W.WH6@WH6@6AW.W.6A6BW.W.WH6BW.W.W<W<X&6BX&6BX&X&W?W?W?6BW?6BW?W=W=W=W?W?W=W=6AW=W=6AW=W=W=W=W?W=W=W=W=W?W,W,W?W?W,W,W?W?W,W,W,6=W,6=W,6>W,W?6>W?W,6>W,W,6>W?W?W?W,W?W,W?WXWXWXX06<X0X0X0WXWX6<6=WXWX6=W4WXWXW4W4WXWXW4WXWX6;6<X#WXWXX#X#T@T@T@6;UN6;UNUN6;UNUNUN6;6<TCTCT-6<UH6=UHUH6=UHUDUHUDV6SCT$6<T$X06<6=W$X-X-6=6>W$6>W$X-X-X-6>W$6>6?6@W$X-X-W$6@W$6@W$W$6@X-6AX-W$W$W$6AWXWXWX6AWX6AWX6BWXWXWDWXWX6AWXWX6AWXWXWX6A6BW4W4TF6BTF6CTFTKTFTKS6S6S?S?SZSZSB6ASZSZ6ASZSBSZSBSZ6@SZSBSBSB6@SBSB6@SZ6ASZTFTFTF6AS0SOS06A6A6BS0S06BSO6CSO6CT&SOSOSOSOSO6CSOSO6CT&T&SMT&6C6CSM6DSM6DSM6ESMSMSM6ESMS5S5S56ES5S56ESLS5S56E6F6FSQ6GSQ6GSISISISISISQ6G6GSI6H6ISISISI6ISISYSYSYWAWAWA6HWA6H6I6J6JWA6K6LWAWA6LWYWAWY6LWYWYWYWYW7WYW7W7W76JW(6KW(U(U(T/U(T/6JT/T/SL6JSL6KS9S9S96KS9SLSLSLS9S96JSLS9S9SLSLSQSQSQ6I6ISISISISQ6ISQSQSQSKSKSKSQ6HSQSKSQSKSQ6HSQ6HSQSK6HS:6IS:6ISKSKSKS:SKS:S:SK6HSKS:S:6HS:S@6H6IS@S@S@SYS@6ISYSY6ISYS@6IS@S@V)TT6ITTV-V-V-6IT?V-T?6IV-V-V-6I6I6JT?T?6JUET?T?6JSQ6K6LSR6LSRSR6L6MSR6NSR6NSRSRS8S86NS8STS8S8S8S8S8S86MS86M6NSTS8S8S86N6NSTSTSTSTS8STST6M6NT3T3UA6NTITIT=TI6NTITTTT6NV3TIV3TIV3SRSR6M6NS86NS8S8STST6NSTSG6NSGSGT16NT1T16NT26OT2T26OT26P6PT=6Q6RT26RT2T2T=T=6R6ST26ST2T=6STIT=6TT=6TT=T=V3V36TV36T6U6VT2T26V6WV3T2T2T26W6WV36XV3T=6XT2T26XT=6YT=T26YV3V3SESGSESGSGSGSU6X6XSGSUSUSGSGSG6X6XSUSUSUX>6XXFXF6XXFXFXFT5T56X6YT76YT7T7T7T5T7T7T76XT76YT5T5T56Y6YT7T7T7T2T2T26YT2T26YT2T26YT0T06YT2T06ZT2T26ZT2T0T2T06ZT2T2T2T0T2T26Y6Z6Z7#URURUR7#URUR7#V37$7%7%UR7&URT27&T2URT2URT27&T2UR7&UR7&URT2URT2T27&T27&T0T0T07&UR7'URV37'URURV3V37'V3UR7'URURURURT0URSG7&SG7'XFXFXD7'7'XF7(7)7)7*XDXDXFXFXD7*XFXF7*XFXFXF7*XFXD7*XDXD7*7+T7T7T1T1T6T6T1T1T6T6T1T1T6T6T1T1T6T6T1T1T6T67&YWYWYWY9Y97&Y9Y9Y9YW7&Y9Y97&Y9YWY9YWY9X1X1X1X)7$7%X)X)X1X1X)X)7$7%X)X)7%X)X)X)X1X17%7&X1X1X17&Y6Y6YB7&7&YB7'YBY6Y6Y67'Y67'YBYB7'YBYBYBY6Y67'YBY6Y6YBYBYBYBY6Y6YBYB7%YB7%7&Y6Y6Y67&Y6Y67&Y6Y6Y6Y)Y.Y)Y)Y)Y)Y)7%Y)7%Y)Y.Y)Y.Y)Y.Y)Y.Y.Y.YJ7#YWYW7#YWYWYWYJYJYWYJY5Y56ZY.Y.6ZY.Y.Y5YWY5Y5Y.Y.6YZ'Y.6Y6ZZ'6ZZ'Y.7#7#YNZ%Z%YXYXYNYNYNYX6ZYXYN6ZYNYNYX6ZYXYX6ZYI7#YIYX7#YXYI7#7$YZYZYPYP7$YPYP7$7%X1YP7%YPYI7%7&YIYI7&7'YIYI7'YPYPYPX17'X1X1YPYPX1X1YPYPYP7&7&X1X1X1YPX17&X1YPX1X1X1X1YIYIYIYIX1YIYIYI7#YI7$YI7$YIX1YIYIYIX1YI7#X1X1YIYIX17#X1YIX1YIX1X1WRX1X1X1X16YX1X16YX)X1X)X)X)WJW@W@W@WJWJ6W6XW@W@W6W@VBVBUCUCVBVBUCUCVBVBUCUCVBVBUCUCVBVBUCUCVBVBUCUCVBVBUCUC6PTNUY6Q6QTNTNTNVDVDVD6QVDVD6QTNVDVDTNTNULULTN6PTN6PTNTNULULTNULTN6O6PUL6PULTNTNULULTNTNULULTN6O6O6PTNTNV@6PTZTZV@V@TZTZUPUP6O6PUPUP6PUPUPUPUUUPY0Y06OY0YK6OYKYK6OY)Y0Y)Y0Y0Y06OY0Y06OYKY0Y0YKYKY0Y06N6O6OYKYKYK6O6PYKYK6P6QYKYKY0Y06QY0YK6QYKYKY0Y0YKY06PY0YKY0Y0Y0YKYKYK6OYKYK6O6PYKYKY0Y06PY0YK6PYK6QYKY0YKY0Y06PY06QY)Y)Y0Y0Y)6PY0Y0Y)Y)Y)6PY)6PY0Y0Y06P6QY06Q6RY0Y0Y)Y)Y0Y0Y)Y0Y0Y0Y)Y)Y0Y06OY)Y0Y)Y)Y)6OY)6OY0Y0Y0Y)Y)6OY0Y)Y)6OY)Y06OY06PY)Y)6PY)Y)Y)Y)6PY)Y.Y)Y)Y.Y)Y.6OY)Y)6O6PY)Y)6PY)Y.Y.Y)6PY.Y.Y)Y.Y)6OY)Y)Y)Y)Y)Y.Y)Y)Y.6NY)6NY.Y.Y.Y.6NY.6NY.6OY.Y)Y.Y)Y)Y)6NY.Y.6NY.Y.Y.Y.Y)Y.Y.Y0Y)Y0Y0Y)Y)6LY)Y06L6MY)Y)Y)Y)Y.Y)Y.Y)6LY)Y)6LY.Y)Y.Y)6L6LY.6MY.Y)Y)Y)6M6MY.Y.Y.Y)Y)Y)6M6MY.Y.Y.Y.Y.6MY)6M6NY.Y.Y0Y0Y0Y)Y0Y)6MY)Y06MY06NY0Y06N6O6O6PY)Y)6PY)Y)Y)Y)Y)6P6Q6QY.Y)6RY.Y.6RY.Y)6RY)6SY.Y.6SY.Y)6SY)6T6TY)Y06UY)Y)6UY)6UY)6V6W6WY)Y0Y0Y)6WY)Y.6W6XY.Y.YK6XYKYKY0Y06XY0Y06XYKYKY0YCY0Y0YCYC6WYCY0Y0Y06WY0Y0YKYK6V6WYKYK6W6XYK6Y6Y6ZY07#7#7$YKYK7$7%YKYKYCYC7%7&YCYC7&YKYCYCYC7&YCY.Y.Y.YC7%YCY.Y.Y.7%Y.YK7%YKYKY.Y.7%Y.YK7%YK7&Y.7&Y.7'YK7'YKYKYK7'YKYKYK7'YKYK7'Y.YKYK7'Y.7(7)7)7*YKYKYKYK7*7+7+7,YKYKYKZ)YKYKZ)Z)7+Z)YK7+YKZ)Z)Z)Z)7+Z)YKYKYK7*Z)7+Z)Z)Z)Z)7+Z)7+YKYK7+YKYKYKZ)Z)YKYK7*YKYKYKYKYOYKYKYOYO7)YOYKYKYO7)YKYKYOYOYOYKYOYOY.Y.Y.7'7'Y.YKYKYK7'YKY.YKYKYK7'7'Y.Y.Y.YKYK7'YKYKY.YKY.7&Y.Y.Y.Y.Z'7&Z'7&Z'Y.Z'Y.7&Y.Y.Y.7&Y.7'Y.Z'Y.Y.7&Z'7'Z'7'Z'Z'Z'Z'Z'7'Z'7'Z'Y.Y.Y.YMYMYMY.Y.Y.7&Y.Y.YM7&Y.7&Y.Z'Y.Y.Y.7&Y.Y.Y.7&7&Z'7'7(7(Z'7)Z'YKYKYK7)YKYKYKY.YKYK7(Y.YK7(7)Y.7)Y.7*Y.YK7*YKY.7*Y.Y.Y.YKY.Y.Y.7)Y.7*Y.7*Y.YKYKYKYKYK7*YK7*YKY.7*Y.YK7+7+Y.YK7,Y.Y.7,7-Y.Y.Y.7-YK7-Z)Z)Z)7-Z)7.Y.Y.7.7/Y.Y.Z)Z)7.Z)Z)Z)Y.7.Z)Z)Y.7.Z)Z)7.Y.Z)Z)Y.Y.Z)Z)7-7.Z)Z)Z)Z)Y.Y.Z)Z)7-Z)Y.Y.Z)Z)Y.Y.Z)7,Y.Y.7,Z)7,Z$Z)7-Z)7-Z)7.Z)Z)7.Z$Z$Z$7.Z$7.Z#Z#Z#7.Z#7/Z#7/YOZ)Z)Z)Z)7/Z)YOZ)7/70Z)Z)70Z)Z)YO70YOZ)Z)Z)YOZ)Z)7/YO7/YOYOYOYOZ)YO7/Z)YO7/YOZ)Z)YOYOZ)Z)7.7/Y.7/70Z$Y.70Z$Z$7071Z$Z$Y.71Y.7272Z$Z$Z$7273Y.Z$73Z$Z$Z$YOYA73YA73YAYOYOYA73YOYO7374YO75YO75YO76YAYAZ(76YO7677YA77YAYOYOYAYAYO77YO77YOYO77YAYO78YOYO787979YAYO7:YOYOYO7:7:YAYAYAYMYMZ$Z$YMYMZ$YMYMZ'YMYMZ'Z'77Z'Z'Z'7778Z'Z'7879797:YMYM7:YMYMYM7:Z'7;Z'7;Z'YM7<Z'Z'YM7<YMYMYM7<YM7<Y/Y/Y/7<Y/Y/YMYMZ$Z$Z$Z$Z$7;7;Y27<Y27<7=Y2Y2Z$Z$7=Z$Z$7=7>Y2YMYMZ$YMY/Y/7=Y/Z$Y/Z$Z$7<Y/Z$Z$Y/Y/7<Y/Z$7<Z$Y/Z$Y/Z$Z$Z$Z$Z$7;Z$7;Z$Y2Y/Y/Z$Y27:Y/Y2Y/Y/Y/Y27:Y27:Y2Y27:7;Y2Y27;7<Y2Y27<Y/Y2Y27<Y2Y2Y2Y/Y/7<Y/Y/Y/7<Y/Y/Y/Y/7<Y/7<7=Y2Z$Z$7=Z$YAYA7=YA7=7>YAYAZ$7>YAYAYAY27>Y27>Y2YAYAYAYAZ(7>7>Y27?7@Z(Z(Z(7@Z(Z(YR7@Z(Z(YRZ(Z(Z(Z(7?7?Z(YRZ(Y/Y/Y/7?Y/Y/Y/Y27>7?Y2Y2Y27?Y2Y27?7@Y2Y2Y/Y/Y/7@Y/7@Y?Y?Y/7@Y/7AY?Y?7A7BY?Y?7BY?Y/Y/Y2Y27A7BY2Y2Y2Y27B7CY27CY-Y-Y2Y27CY2Y2Y2Y27CY1Y1Y-Y-Y1Y17BY1Y27BY2Y1YGYGZ'Z'Z'7AZ'YGYG7AY?Y?YGYGY?Y?Y?Y?Y?7@Y?Y?7@7A7AY?Y4Y47AY4Y1Y4Y?Y?Y4Y4Y?Y?Y4Y?Y47?Y4Y?Y?Y?Y4Y?Y4Y?Y4Y?Y4Y?7=Y?7=Y?Y4Y?7=Y?Y17>Y17>Y1Y17>7?Y?Y1Y?Y?Y1Y17>Y1Y1Y1Y?Y?Y1Y1YIYI7=7>YIYIY?Y?Y?7=Y?Y?7=YIY?Y?YIYI7=YI7=YI7>YIYIYIY?Y?YIYI7=7>YIYIY?YIY?YI7=YIYIYIYI7=Z&Y+Y+Y+VX7<VUVU7<7=VUVUVRX+VRX+VRVR7<7=7=X+X+X+X*W6X*W6W6W6W67<X*7<X*X*7<X*X*X*7<7=WXWXW)W)WXW)7<7=WXWX7=X/WXWXX/X/WX7=UCTYUC7=UCUCUCTYUC7<TYTYTY7<TYTYTZTZTNTNTZTZTNTNTZTZU3U3797:U3U3TNU37:U37:7;TNTN7;TZU3U3TZTZU3U37:7;U3U3TZTZU3U3TZTZ7:7;TZTZV@V@TZ7:TZ7;7;V@7<V@7<7=V@V@TZTZTZ7=TZTZ7=7>TZTZ7>7?TZTZ7?7@TZTZ7@7A7AV@7BV@7BV@V@V@TZTZUUUUTNU4TNU9U4U4U9U9TNU9TNU9U47>U9U9U4U37>U37>U3U9U3TNTNTN7>TNU37>U37>U87?U8U7U7TNU7U3UUU3UUU3UUU3UUUUUUU>7<U>7<U>U>V@7<V@7=V@7=V@7>TZTZTZ7>7>V@7?V@TZ7?TZ7@TZV@TZV@7?V@TZV@TZV@TZV@V@7>V@7?UUUU7?7@7@UU7AUUV@V@V@UU7@UUUUUUV@UUUUUUYD7?YDY@7?YDY@Y@YDYDYDY@YD7>Y@Y@Y@YD7>YDY@7>Y@YDYDYDYDYKYD7=YDYDYKYKYDYKY@YDYDYDYKYKY*Y*YKYKYK7:YKYKYDYDYKYD79YK79YKYKYKYDYKYDYKYKYKYDYDYKYKYDYDYKYKYDYKYKYK7576YKYK76YDYOYOYK76YK76YK77YKYKYHYKYOYO76YO76YOYKYOYOYOYO76YO76YOYOYOYO76YQ76YOYQYOYQYQ767777YOYOYO77YRZ(Z(YRYR77YR77YRZ(YRYRYRZ(77YRYRZ(77Z(YRZ(Z(Z(YLZ(7676YLZ(Z(YR76YRY-YYYYYY76YUYUYYYUYY7576YU76Y1Y-7777Y1Y-Y-Y1Y1Y-Y-Y1Y1Y-Y1YV7576Y17677YVYVY1Y1YVYVY1Y1Y17676YVYVYVY1Y1767777YVYVYVY1Y177YVYVY1YVYV76YVYVYVY;Y;76Y;Y,Y;Y,Y,Y,Y,Y,75Y,75Y,Y,Y,75Y,Y;Y;Y;Y;X&Y;74X&X&74X&X&X&W#W#X&74W#7475X&75W#X&W#X&75X&X&7576X&X&X2W#X2X2W#W#W#75W#W#7576VWWVVW76VWVWVW76VW76VWVW76WVWVW/WVWV76WVWVWVVWWVWVWV75767677VWVWWVWVVWWVWSVRWSWS75VRWS76VRVR76X$76X$X$X$VRVR7677VR77X$X$77X$X$X$VRVR7778VR78X$X$7879X$X$VRX$X$X$W'78W'X$7879X$X$79X$X$X$W'X$X$X$W'X$X$X$VRVRW'W'VRVR76VRW'VRW'W'VRVRVR7575X$76X$X$76W/W/76X$W/W/X$X$W/W/X$X$X$75X$75X$X$X$X$W/W/X$X$7475X$X$75W/X$X$W/W/X$X$X$74X$X$7475X$X$757676X$W/W/X$76X$77X$X$W/W/W'W'X$76W'W'76X$W/W/7677W/W/W/7777X$X$X$77X$X$X$W/77W/W/77X$W/W/X$X$W/X$X$X$76X$X$X$X$76X$X$W'W'W/W/W/75W/W/W'W'74W'W'W'7475W/W/7576W/W/76W/W/W/W/W/W'W'W'W'W'75W/W/W/W'W'74W/7575W'76W'X$X$76X$W/W/W/W'X$X$W'W'74W'W'W'7475X$X$W'757677X$X$X$W'W'X$X$X$WV75WV76W/W/76WVW/W/7677W'X$W'X$X$76X$W'W'W'W'76W'W'X$W'X$75X$X$75X$X$X$X$W'X$X$X$X$7475X$X$75W'75W'W'W'W'W'X$X$W'W'74W'W'W'747575W'X$X$W'W'W'75W'W'757676W'X$777778X$X$X$X$W'X$X$X$7778X$7879W'X$X$X$79797:W'W'7:7;W'W'X$X$X$7;X$7;7<W'7<X$W'W'X$X$W'X$X$X$W'W'X$X$7:7;7;W'W'W'W'7;W'W'X$7;7<W'X$7<X$7=7=W'7>W'VRVRW'W'VRVRW'W'VRVRW'7<W'7<W'W'7<VRW'W'VRW'W'W'WXWXWX7;WXWX7;WXWXWXWX7;WXWXWXWP7:WPWPWPWPWP7:WPWXWPWPWPWX79WPWPWPWPWW79WW79WWWWWPWPWP79797:WWWWWPWPWP7:WP7:7;WW7;WWWWWWWPWPWP7;WP7;WWWW7;7<WWWW7<WWWWWWWX7<WPWPWXWP7<7=WP7=WP7>WPWPWP7>WPWP7>WWWW7>WWWWUCV&UCV&UC7=UC7>UCUCUC7>UC7>UCUCUCV&V&V&UCUC7=7>UCUC7>V?UCUCV?V?UCUCV?V?UC7<V?V?UCUC7<V?UCUCV?V?UCUCV?V?UC7:V?V?7:UCV?V?UC7:V&V&7:UCV&V&7:7;V&V&V?V&V?7;V?V&7;U2V&V&7;7<V&V&7<TYV&V&TYTY7;TYTYTYV&7;U2U27;7<U2U27<U2U2U2U27<U2U27<7=U2U2TYTYTPTPTYTYTPTPTYTY7;TYTP7;TPTPTP7;TPTP7;TYTP7<TYTY7<TYTPTYTPTPUUUU7;UUTNUU7;UU7;YDY@YDY@YDY@7;7;S=S<7<S<S<7<S=S<7<7=S=S=S=7=S<S2S27=7>7>S2S<S<W0W07>7?W07?7@WIW0W07@W0WIW0WIWIY;Y;W+7?7?W+W+W+Y;Y;W+7?Y;Y;7?Y;W0W0WIW0W0W0WIWIW+W+7=7>W+W+7>7?7?W&W&W+W+W+7?W+7?W+W+W+W&W&W&W+W&W9W&W9W9W9W9W2W97<W9W9W+W+7<W+7<W+W9W+VS7<VSVSW+W+7<W+VSW+VSW+W9W97;7<W1W17<W9W1W1W1W9W9W9W2W2W9W9W9W2W9W9W979W9VSW9VS7879W+W+W+VYW+VYW+78W+VY78W+W+W+Y;Y;Y;78VY78VYVYY;Y;VYY;X&77X&X&7778X&X&VYVY787979X&VYVY79X&7:X&X&X&VYX&VY797:X&X&X&VYX&X&X&797:X&X&X&7:X&X&VYVYX&X&VY7979X&7:X&VYX&VYVY797:VYVYVYVYWCVYX&X&79X&X&X&VYX&VY78VY79VWVWX&VWX&78X&X&VWVW78VWX&X&X&7878VWVWVWW:78W:W:78WVW:WVW:78W:W:7879W:W:79W/W:7:7:W/W:7;W/W/7;W/7;W/W:7<W/W/7<W/W:7<W:W:7<W/W:W/W:W:W/W:W/W:W/W/W:W<W:W<W:79W:W:W<W<79W<79W<W:W:W:79W<W<797:W:W:W<W<W:W:W<W<79W<79W<W:W<W:W:79W<79W<W<W<W:W<W:W<78W<W<W<W:W<W:W:77W?W?W?W<W<W<7777W?W?W?77W?W<W<W<W?W<W<W<W<W<76W<76W?W?W<W?W?W?W<W<W<75W<W<W<W?W<74W<W<74TNV#75TO7576UQ76UQ777878TNUJ79UJ79UJUJTNTN79TN79TNUJ7:UJTNUJ7:TNTN7:TN7:TNTNTNTNTNUJ7:7:7;UJ7<UJ7<UJUJ7<TN7=TNUJ7=UJUJ7=7>UJUJTNUUTN7>TN7>UUUU7>X&VYVYX&X&7>7?W.W.W.7?W.WHW.W.7>WH7?WHWHWH7?7@WHWH7@7AWHWH7AW.WHW.W.W.WH7@WHW.W<W<7@W<X&7@X&W<W?7@W?7AW?W=W?W=7@W=W?W?7@WXW=7AW,W?W,7AW?W?7AW?7AW?W?W?W?W?7AW?W,7AW,7B7BW?W?W?WX7B7C7DWXWXWX7DWX7DW4W47DW4W4W4WXWXWXX#WXX#X#X#7BUNUNUNUQUQ7B7CUQ7C7DUNTJTJTCTCTJTJTCTJT-T-UHUHUHUHUH7AUHUH7AUHSC7ASCT$X0X0X07A7AW$W$W$7AX-W$W$X-X-7AX-7AX-X-X-X-X-7AX-X-X-X-7AX-X-7A7BX-W$X-W$X-X-W$X-W$7@W$W$X-X-7@X-W$7@W$7AW$X-W$X-WXW4WXW4WXWXWX7?WX7?WX7@WX7@WXWXWDWD7@WDWX7@W4W47@W4W4W47@TK7ATK7ATKTFTKSZ7ASB7B7BSZSB7CSB7CSBSBSB7CSBSBSZSZ7CSZSB7CSBSBTF7CTF7DS0SOS0S0S0SOS0S0SOSO7B7CSOSO7CSOS0SOS0SOSO7BSOSOSOSOSO7B7B7CT&T&T&SM7CSMT&7CT&7DT&7DT&7ET&7E7FSMT&SMSMSM7ESMT&SMS5S57E7FS5S5SLSLS5S5S57E7ES5SQ7FS5SQS5SQ7ESQSQSQSQ7E7FSI7FSISQSQSQSISQSISQ7ESQSQ7ESQSQSQSISISYSYWAWAWAWYWAWAWA7CWY7CWYWY7CWYWYWYWAWA7CWAWY7CWYWYWAWA7CWYWAWAWYWYWAWYWAWYW(W(W(WBW(WBWBWB7?U(T/U(SLSLSL7?SL7?SLSLS9S97?7@S97@7ASLSQSQSQ7ASISI7ASISQ7ASQSI7ASKSKSKSKSK7ASKSKSKSQSKSQS:SQS:SQS:SQS:SI7>SI7?SKSKSKS:S:S:S:S@SKSKS@S@SKSKS@S@S@7;S@S@7;SYS@7<S@S@S@SYV)7;V)V)V-V-V-7;7;UET?7<V-V-T?T?V-V-7;T?V-7;7<T?UEUE7<UESRSQSR7<SR7<SRSR7<SQSRSRSR7<SRSRS@S@SRSRS@S@7;S@SR7;SRSRSRS8SRSRS8S8STS8S8S8S8STSTST78ST7879STSTS8S8797:S87:STSTUAUAUA7:UAUA7:UAUATITITIT=TIT=TI78797:V3SFSRSFSFSRSR79SRS8S8S879STST79STSGSFSGSGT178T17979T27:T27:T2T1T2T2T2T27:T27:T2T2T2T=T27:T27:T2T2T=T=7:T=T2T=T2T2797:T2T2T=T=7:T=T27:T2T=T=7:T=7;T=TIT=T=T=T=T=7:7:V37;V37;V37<7=V3V37=V3T2T2T=T2T2T27<V37<V3V3V3T2T27<V3T2T2T2V37;V3V3V3T=T=7;7<T=T=7<T=T27<T2T2T2T27<V3SGSGSUSUSGSGSGSUSGSG7:7;SG7;SGSUX>X>7;7<X>X>7<7=T77=T7T7T5T57=7>7>7?T7T7T7T5T7T5T7T5T7T7T5T57=7>T77>T7T7T2T2T9T9T2T2T9T9T2T0T0T0T0T2T0T07:7;T0T0T2T27;T2T07;T0T0URURT2URV3V3URV3T279T2URURV3URURURV3UR78V3V378V3UR78URURV3V3URV3T2URT2UR76UR77UR7778URUR78URT279T2T2T2URT2URT2T277T0T0T0T2T277T277URT2URT2UR77URV3V3UR7777V3UR787879URURSUSUSG79SGSUSUSU78XDXDXDXFXF78XF7879XDXD79XF7:XF7:XFXDXDXFXDXDXDXFXFXD79XFXF797:XFXF7:XF7:7;XDXD7;7<T7T7T0T0T7T0YWY9YWYWYWY9YWYWY9Y9YWYWY9Y9YWY9X1X1X)X)X1X1X)X)X)X1X)X)X1X1X)X)X1X)X)X)X1X1X)X)X1X1X)X)X1X1X1X)Y6Y6YBYBY6YBY6YBY6YBYBYBY6Y6YBYBY6Y6YBYBY6YBYBYBY6YBYBYBY6YBY6Y6YBYBY6Y6YBYBY6Y6Y6YBY6Y6YBYBY6Y6Y)Y.Y)Y.Y)Y.Y)Y.YJYJYWYWYJYJYWYWY5Y5Y.Y.Y.Y5Y.Y.Y.Y.Y.Z'Z'Z'Y.Z'Y.Y.Y.Z'Z'Z'Y.Z'Z'Z'Y.Z'YNYNZ%Z%YNYXYNYXYXYXYNYNYXYIYXYXYIYIYXYIYXYXYXYIYXYXYXYIYPYPYZYZYPYPYZYPYZYZYZYPYPYPX1X1YPYPYPX1YPYIYPYPYIYPYIYIYPYPYIYIYIYPYIYIYPYPYIYIYPYPYPYIYPYPX1X1YPX1X1X1YPYPX1X1YPX1YPX1YIYIYIX1YIX1YIX1YIYIYIX1YIYIX1X1X1YIX1YIX1X1X1X)X1X)X)X)WJWJW@W@WJWJW@W@UYTNUYUYUYTNUYUYUYTNUYTNVDVDVDTNVDVDTNTNULULTNULTNULTNTNTNULULULTNULULULULULTNULULULTNULULULTNTNULULTNTNV@V@TZV@UPUPUPUUUPUPUUUUUPUPUUUUY0Y0YKY0Y0Y0YKY0Y0Y)Y0Y0Y0Y0YKYKY0YKYKYKY0Y0YKYKY0Y0YKYKY0YKYKYKY0Y0YKY0Y0Y0Y0YKY0Y0YKYKY0Y0YKY0Y0Y0YKY0Y0Y0YKY0YKYKYKY0Y0Y0YKYKY0Y0YKYKY0Y0YKY0Y0Y0YKYKY0Y0YKY0YKY0YKY0Y)Y)Y0Y)Y0Y)Y0Y)Y)Y)Y0Y0Y)Y)Y0Y0Y)Y0Y0Y0Y)Y)Y0Y0Y)Y0Y0Y0Y)Y)Y0Y0Y)Y)Y0Y0Y)Y)Y0Y)Y0Y)Y0Y)Y0Y)Y0Y0Y)Y)Y0Y0Y0Y)Y0Y0Y0Y)Y0Y)Y0Y)Y0Y0Y)Y)Y0Y)Y)Y)Y.Y.Y.Y)Y.Y.Y)Y)Y.Y.Y)Y)Y.Y.Y)Y)Y.Y.Y.Y.Y)Y)Y)Y.Y)Y.Y)Y)Y.Y.Y)Y)Y)Y.Y.Y.Y)Y)Y)Y.Y)Y)Y)Y.Y.Y.Y)Y)Y.Y.Y)Y)Y.Y.Y)Y)Y0Y0Y0Y)Y)Y)Y0Y)Y0Y0Y)Y.Y)Y)Y)Y)Y)Y.Y)Y.Y)Y)Y.Y.Y)Y.Y)Y.Y)Y.Y)Y)Y.Y.Y)Y.Y)Y.Y)Y.Y.Y.Y)Y.Y.Y.Y.Y)Y)Y)Y)Y)Y.Y.Y)Y.Y.Y.Y0Y0Y0Y)Y0Y)Y0Y0Y0Y0Y0Y)Y0Y0Y0Y)Y0Y)Y)Y)Y0Y)Y0Y)Y0Y)Y)Y)Y)Y)Y0Y)Y)Y)Y)Y.Y)Y.Y.Y.Y)Y.Y)Y)Y)Y.Y)Y.Y.Y.Y.Y)Y)Y.Y.Y.Y)Y.Y)Y)Y.Y.Y)Y.Y)Y.Y)Y.Y)Y.Y)Y.Y0Y)Y0Y)Y)Y)Y0Y0Y)Y)Y0Y)Y0Y)Y0Y)Y)Y)Y0Y0Y)Y)Y0Y0Y)Y)Y)Y0Y)Y)Y)Y.Y)Y.Y.Y.Y)Y.Y.Y.Y0Y0YKYKYKY0YKYKY0Y0YKYKY0Y0Y0YCY0YCY0Y0Y0Y0Y0YKY0Y0YKYKY0Y0YKYCY0YCYCYCYKYCYKYCYCYCY0Y0YCYCY0YCY0YCY0YCYCYCYKYKYCYCYKYKYCYCYKYKYCYCYKYCYCYCYCYKYCYCYKYCYCYCYKYKYCY.YCY.YCY.YCY.Y.Y.YKYKYKY.YKYKYKY.YKY.YKY.YKY.Y.Y.YKYKY.YKY.Y.Y.Y.Y.YKY.YKYKYKY.YKYKYKY.Y.YKYKY.Y.YKYKY.Y.YKY.YKY.YKYKY.YKYKYKYKY.YKYKY.Y.YKY.YKYKYKZ)YKYKZ)Z)Z)Z)Z)YKZ)Z)Z)YKYKZ)Z)Z)YKZ)YKZ)Z)Z)Z)YKYKZ)YKZ)YKYKZ)Z)Z)Z)Z)YKZ)Z)Z)YKZ)YKYKYKZ)Z)YKYKYKYOYKYOYOYKYOYOY.Y.YKY.Y.Y.YKYKYKY.YKYKYKY.YKY.YKY.Y.Y.YKYKY.Y.Y.Y.YKY.Y.Z'Z'Z'Y.Z'Y.Z'Y.Z'Y.Z'Y.Z'Y.Z'Y.Y.Y.Z'Y.Y.Y.Z'Y.Z'Z'Z'Z'Z'Y.Z'Y.Z'Y.Z'Y.Z'Y.Y.Y.Z'Y.Z'YMY.YMYMY.Z'Z'Z'Y.Z'Z'Z'Y.Y.Y.Z'Y.Y.Y.Z'Z'Z'YMYMZ'Z'YMYMY.Y.Y.Z'Y.Z'Z'Z'YKYKYKY.YKY.Y.Y.YKY.Y.Y.YKY.YKY.YKY.YKY.YKY.YKY.YKYKYKY.YKY.Y.Y.YKY.YKY.YKY.YKY.YKY.YKY.YKYKYKY.YKY.Y.Y.YKY.YKY.Y.Y.YKY.YKY.YKY.Y.Y.Z)Y.Y.Y.Y.Z)Y.Y.Z)Z)Y.Y.Z)Y.YKYKZ)Z)Z)Z)Y.Y.Z)Y.Z)Z)Y.Y.Z)Z)Y.Z)Z)Z)Y.Z)Z)Z)Y.Y.Y.Z)Y.Y.Y.Z)Y.Y.Z)Y.Y.Y.Y.Z)Y.Y.Z)Z)Z)Z)Y3Y3Y.Y.Z)Z)Y.Y.Z)Z)Z)Z$Z)Z$Z$Z$Z)Z$Z)Z$Z)Z$Z)Z$Z)Z$Z)Z$Z$Z$Z#Z$Z#Z$Z)Z#Z#Z#Z#Z#Z)Z#Z)Z#Z)Z)Z)Z)YOZ)YOZ)YOYOYOZ)YOYOZ)Z)YOYOZ)Z)YOYOZ)YOZ)YOZ)Z)Z)YOZ)YOYOYOYOZ)YOYOZ)Z)Z)YOZ)Z)YOYOZ)YOYOYOY.Y.Y.Z$Y.Y.Y.Z$Y.Y.Z$Z$Y.Y.Y.Z$Y.Y.Z$Z$Y.Z$Y.Y.Y.Z$Z$Z$Y.Z$Z$Z$Y.Y.Y.Z$Y.Y.Z$Z$Y.Z$Z$Z$YOYAYAYAYOYAYOYOYAYAYAYOYAYAYOYOYAYAYOYAYOYAYOYAYOYOYOYAYOYAYOYOYAYAZ(Z(YOYAYAYAYOYAYAYAYAYAYOYOYOYAYOYOYOYAYOYOYAYAYOYOYOYAYOYOYOYOYAYAYOYOYAYOYAYAYOYAYAYAYOYOYOYAYAYAYOYOYOYAZ'Z'YMZ'Z'Z'YMYMZ'Z'YMYMZ'Z'YMYMZ'Z'YMZ'YMZ'YMYMZ'Z'YMYMZ'Z'YMYMYMYMYMZ'Z'Z'YMZ'YMZ'YMYMZ'Z'YMZ'Z'Z'YMYMYMYMY/YMYMYMYMY/Y/YMY/Y/Z$Z$Y2Y2Z$Z$Z$Y2Z$Y2Y2Y2Z$Z$Y2Y2Z$Z$Y2Y2Z$Z$Y2Y2Z$Y2Z$Y2Z$Y2Y2Y2Z$Y/Z$Y/Z$Y/Z$Z$Z$Y/Z$Z$Z$Y/Y/Y/Z$Z$Z$Y2Z$Z$Z$Y2Y2Y/Y2Y2Y2Y/Y2Y2Y2Y/Y2Y2Y/Y/Y2Y2Y/Y/Y2Y2Y/Y/Y2Y2Y/Y/Y2Y2Y/Y/Y/Y2Y/Y/Y2Y2Y/Y/Y2Y/Y/Y/Y/Y2Y/Y/Y2Y2Y/Y2Y2Y2Y/Y2Y2Y2Z$Z$Z$YAYAYAZ$Z$Z$Z$YAYAZ$Z$YAYAZ$YAZ$YAYAY2Y2Y2Y2Y2YAY2YAZ(Z(Z(Y2Z(Z(Z(Z(Y2Y2Y2Y2Y2Z(Y2Z(Z(Z(YRYRZ(YRYRYRYRYRZ(Z(Z(YRYRY/Y/Y2Y2Y/Y/Y/Y2Y/Y/Y2Y2Y2Y/Y2Y2Y/Y/Y2Y2Y/Y2Y2Y2Y/Y/Y/Y?Y/Y/Y?Y?Y/Y?Y/Y?Y/Y?Y/Y/Y?Y?Y2Y2Y?Y2Y2Y2Y2Y?Y2Y2Y/Y/Y2Y2Y/Y2Y2Y2Y2Y2Y2Y-Y2Y2Y-Y-Y2Y-Y-Y-Y2Y2Y-Y-Y2Y2Y2Y1Y-Y1Y-Y-Y2Y2Y2Y1YGYGZ'YGYGYGY?Y?Y?Y?Y1Y1Y?Y?Y1Y1Y?Y1Y1Y1Y?Y?Y4Y4Y4Y4Y1Y4Y4Y?Y4Y4Y4Y?Y?Y?Y4Y?Y4Y?Y?Y?Y1Y1Y1Y?Y1Y?Y1Y?Y1Y1Y?Y?Y?Y1Y?Y?Y1Y1Y?Y1Y1Y1Y?YIY?Y?YIYIY?YIYIYIY?Y?YIYIY?YIYIYIY?YIY?YIY?YIY?Y?Y?YIYIYIY?YIYIYIY?Y?YIYIY?YIYIYIZ&Z&VXVXVXVUVXVXVUVUVXVUVUVUVRVRX+X+VRX+X+X+VRVRVRX+W6W6W6X*W6W6X*X*W6W6X*X*W)W)WXWXW)W)WXW)WXX/WXWXX/X/WXWXX/X/WXWXWXX/WXX/UCTYUCTYUCTYTYTYTYTNTYTYTZTZU3U3TZTZU3U3TNU3TNU3TNU3TNTNU3U3TNTNTZTZU3U3TZTZU3U3TZTZU3U3TZTZTZV@TZTZV@V@TZTZTZV@TZV@V@V@TZV@TZV@TZV@TZV@TZTZTZV@TZTZV@V@TZTZTZUUTZTZUUUUTZTZUUUUTZTZUUUUTZTZUUUUTZTZUUUUTZTZUUUUTZTZUUUUTZTZUUUUTZV@TZV@TZV@TZV@TZV@TZV@U4U4U9U9U4U3U4U3U4U3U9U3TNTNU3U3TNTNU3U3TNTNTNU8TNU8U8U8UUUUU>U>UUUUU>U>V@UUV@UUV@UUV@UUV@UUV@V@V@V@V@UUTZV@V@V@TZV@TZV@TZTZTZV@TZTZTZV@TZV@V@V@TZV@TZV@V@UUV@UUUUUUV@UUUUUUV@V@UUUUV@UUV@UUV@UUV@UUV@UUV@V@UUUUYDYDYDY@YDYDY@Y@YDYDYDY@Y@YDYDYDY@YDYDYDYKYKYDYDYKYKYKYDYDYKYDYKYKYKYDYKYKYKYDYDYKYKYDYDYKYKYDYDYOYOYKYOYKYKYKYHYHYHYKYHYOYOYKYOYKYOYKYOYOYOYOYQYOYQYOYQYOYOYQYQYOYOYQYQYQYQYOYOYQYQYOYOYQYQYQYOYRYRZ(Z(YRYRZ(YRZ(YRZ(Z(YRYRZ(YRYRYRZ(YRZ(YLZ(YLYLYLZ(YLYRY-Y-Y-YYYYYUYUYYYUYYYUYYYUYUYUY1Y1Y-Y1Y1Y1Y-Y1Y-Y1Y-Y-YVYVY1Y1YVYVYVY1Y1Y1YVYVY1Y1YVY1Y1YVYVYVY1Y1YVYVY1Y1Y1YVY1YVYVYVY1YVYVYVY1Y1YVYVY1YVYVYVY;Y;Y,Y;Y,Y;Y,Y,Y,Y,Y,Y;Y,Y,Y,Y;Y;Y;X&X&Y;X&X&X&W#W#X&W#W#W#W#X&W#W#X&X&W#W#X&X&W#W#X&X&W#W#X&X&W#W#X&X&W#W#X&X&W#W#X&X&W#W#X&X&VWWVVWVWVWWVVWWVVWWVVWWVWVWVWVW/WVWVVWVWVWWVVWVWWVWVVWWVVWWVVWVWWVWVVWWVVRVRWSVRVRVRWSWSVRVRVRX$VRX$X$X$VRVRVRX$VRX$X$X$VRVRVRX$VRX$VRVRX$VRX$X$VRVRX$X$VRVRX$X$VRVRX$X$VRVRX$X$W'W'X$X$W'X$X$X$W'W'X$X$W'W'X$X$VRVRW'VRVRVRX$X$VRX$VRX$VRX$X$X$X$X$W/W/X$X$W/X$X$X$X$W/W/W/X$W/X$X$W/W/X$X$W/W/X$W/W/W/X$W/X$X$X$X$W/W/X$X$W/W/X$X$W/W/X$X$W/W/X$X$W/W/W/W/X$W/W/W/X$W/W'W'X$X$W'X$X$X$W/W/W/X$W/X$X$X$W/X$X$X$W/W/W/X$W/X$X$X$X$X$W/W/X$X$W/W/X$X$W/X$X$X$W'W'W/W/W/W'W/W/W'W'W/X$W/W/X$X$W/W/X$X$W/W/X$W/W/W/W/X$W/W/W'W'W/W/W'W/W/W/W/W/W/W'W/W/W/W'W/W'W'W'X$X$X$W/W'X$W'X$W'W'X$X$W'W'X$W'W'X$W'X$W'X$W'W'X$X$W'X$WVWVWVW/W/W/WVWVW/W/WVWVW/W/W:W:W/W/W:W:X$X$X$W'W'W'X$X$X$W'X$X$W'X$X$X$X$W'W'W'W'X$W'X$X$X$X$W'X$X$W'W'X$W'X$X$X$W'X$X$W'W'X$W'X$W'X$X$W'W'X$X$W'W'X$X$W'W'X$X$W'W'X$W'X$W'X$X$W'W'W'X$W'X$X$X$X$X$X$W'X$X$W'W'X$X$W'W'X$X$W'W'X$W'X$W'X$X$X$W'X$X$W'W'X$X$W'X$W'W'X$W'X$X$X$W'X$X$W'W'X$W'W'W'X$X$W'W'X$X$X$W'X$X$W'W'X$W'X$W'X$X$W'W'X$X$W'W'X$W'W'W'W'W'X$X$X$X$W'W'W'W'X$X$X$X$W'W'W'VRW'W'VRVRW'W'VRVRW'VRWXWXWPWPWPWPWPWXWXWPWPWPWXWXWPWPWXWPWXWXWXWXWPWPWPWPWWWWWPWPWWWWWPWWWPWWWPWPWPWWWPWWWWWWWPWPWWWPWPWPWWWWWPWWWWWWWPWPWWWWWPWWWPWWWPWPWPWWWPWPWWWWWPWWWWWWWPWWWWWWWXWXWPWPWXWPWPWPWPWXWPWPWPWWWPWWWPWPWPWWWPWPWWWPWPWPWPWWWPWWWWWWV&V&UCV&UCV&UCV&UCV&V&V&UCV&UCUCUCUCV?V?UCUCV?V?UCUCV?V?UCUCV?V?UCUCV?V?UCUCUCV?UCUCV?V?UCUCV&V&UCUCV&V&UCUCV&V&UCV&V&V&V?V&V?V&V?V?U2U2U2V&U2U2V&V&U2U2V&TYV&V&V&V&V&TYV&V&U2U2V&V&U2U2V&V&U2U2V&V&U2U2V&V&U2U2V&V&U2U2V&V&U2U2TYTYTPTYTYTPTPTPTPTYTPTPTYTYTPTYTYTYTPTYTPTYTPTPUUUUTNUUTNTNUUUUY@YDY@YDY@YDY@YDS<S=S<S=S=S=S<S<S<S<S<S=S<S=S=S=S<S=S<S<S=S=S<S<S<S2S<S<S2S2S<S2S2S2S<S2W0W0WIWIW0WIWIWIW0W0W0WIWIW0WIWIWIW0WIW0Y;Y;W+W+Y;Y;Y;W+W+Y;W+W+W+Y;W+W+W+W+W&W&W+W+W&W+W+W+W+W&W+W+W&W+W&W&W&W+W+W+W&W+W&W+W&W+W9W+W9W9W9W+W9W+W9W+W9W9VSW+VSW+W+W+VSW+W9W9XXW1W9W9W1W9W1W1W1W9W9W9W9VSY;Y;W+Y;Y;Y;W+W+W+W+W+VYY;Y;W+W+Y;VYY;VYY;Y;VYY;X&VYX&X&VYVYX&X&VYVYX&X&VYVYVYX&VYX&X&X&X&X&VYX&VYVYVYX&X&X&VYX&VYVYVYX&VYVYX&X&VYX&VYVYX&X&VYX&X&VYVYVYVYX&VYVYVYX&VYX&VYX&VYVYX&X&X&VYX&X&VYVYVYX&VYVYVYX&VYX&VYX&VYVYX&VWX&X&VWVWX&VWX&X&X&VWX&VWVWVWW:WVW:W:WVWVW:WVWVWVW:WVWVWVWVW:WVWVW:W:W/W/W:W:W:W/W:W:W/W/W:W/W:W/W:W:W/W/W:W/W:W/W:W:W:W/W:W:W/W/W:W/W:W/W:W:W/W/W:W/W:W<W:W:W:W<W:W<W:W<W:W:W:W<W<W<W<W<W:W:W<W<W:W<W<W<W:W<W:W<W:W<W:W:W:W<W:W:W:W<W:W<W<W<W<W<W<W?W<W<W?W?W<W<W<W?W<W?W<W?W<W?W?W?W<W<W<W?W<W<W<W?W<W?W<W?TNTNV#TNTNTNV#TNTOUQTOUQTOTOTOUQUQUQTOUQTOUQTOTOUQUQTOUQUJTNUJUJUJTNUJTNTNTNUJTNTNTNUJTNUJTNUJUJUJTNTNTNTNTNUJUJTNTNUJTNUJTNTNTNUJTNUJTNTNTNUJUJTNTNUJTNUJTNUJUJTNTNUJTNTNTNUJTNUJTNUJUJUJTNUJUJTNTNUJUJTNTNUJTNTNUUTNUUTNUUUUUUX&X&VYVYX&X&VYVYX&X&VYX&W.W.W.WHW.W.W.WHW.WHWHWHW.WHW.W.WHWHW.WHWHWHW.W.WHWHW.W.WHWHWHW.WHW.WHW.X&W<X&X&X&W<W<W<W?W?W?W=W?W=W=W=W?W=W?W=WXWXW=W=W=WXW=W=W,W?W,W,W,W?W,W?W,W,W,W?W?W?W,W,W,W,W,W?W,W?W,W?W,W,W?W,WXX0X0X0WXWXX0X0WXX0X0X0WXW4W4W4WXWXWXW4WXW4W4W4T@UNUNUNUNUQUNUNUQUQUNUQUQUQUNUNUQUNUQUNUHUHUDUDUHUHUDUDSCT$SCT$X0X0X0W$X0X0X0W$X-X-W$W$W$X-W$X-W$X-W$X-X-X-X-W$X-X-X-W$X-X-W$W$X-W$W$W$W$X-W$W$W$X-W$W$X-X-W$X-W$X-W$X-WXWXWXWDWXWDWDWDWXWDWXWDWXWXWXWDWDWDWXWDWXWXWXW4WXW4W4W4TFTKTKTKTKTKTFTKTFTKTFTFSZSZSZSBSZSZSBSBSZSZSBSBSZSZSBSZSZSZSBSZSZSZSBSBSZSZSBSBSBSZSBSBTFTKTFTKTFTKTFTKSOSOS0S0SOSOS0S0SOSOS0S0SOT&SOSOSOT&SOT&SOSOSOT&SOSOT&T&T&T&T&SMT&T&T&SMT&SMT&SMT&SMT&SMT&SMT&T&T&SMSMSMT&SMT&SMT&SMT&SMS5SLSLSLSLS5SLSLS5SQS5SQS5S5SQSQSQS5SQSQS5SQS5SQSQSISISISQSQSQSISQSISQSQSQSISQSQSISISQSQWAWAWYWYWAWAWYWYWAWYWYWYWAWAWYWAWYWAWYWYWYWAWYWYT/U(T/U(SLS9SLS9SLS9SLSLS9S9S9SLS9S9SLSLS9S9S9SLS9SLSLSLSQSISQSISQSISQSISQSISQSISQSQSQSKSKSKSQSKSISISISKSISKSISKS@SYS@S@SYSYS@SYSYSYS@S@V)TTV)TTV-V-V-T?T?V-T?T?T?UET?T?V-T?T?T?V-T?T?T?V-V-T?T?UEUET?T?SQSQSRSQSRSQSRSRSQSQSQSRSQSRSRSRS@S@SRS@S@S@SRS@S8S8S8STSTS8STSTS8S8S8STS8S8S8STS8S8STSTS8S8STSTUAUAUAT3UAUAT3UATTTTTTV3TTTTV3V3TTV3V3V3SFSRSFSRS8STS8S8SFSTSFSTT1T1T2T2T1T2T1T1T1T1T2T2T2T2T1T2T1T2T1T2T2T2T=T=T2T=T2T2T=T=T2T=T2T=T2T2T2T=T2T=T2T=T2T2T=T=T2T=T=T=T2T=T=T=T2T=TITIT=TIT=TIT=T=T=V3T=T=V3V3T=V3T=V3T=V3T=V3T=V3T=V3T=T2V3V3T2T2V3V3T2V3T2T2V3V3T2V3V3V3T2T2T2V3T2V3V3V3T=T=T2T2T=T=T2T2T=T=T2T=T=T=T2T=T2V3V3V3SGSGSGSUSGSUSUSUSGSUSGSUX>XFXFXFXFX>XFXFX>X>XFXFX>XFXFXFT5T5T7T5T7T5T7T7T5T5T7T5T5T5T7T5T5T5T7T5T5T5T7T7T5T5T5T7T5T5T7T7T0T2T0T0T2T2T0T2T0T2T0T0T0T2T0T0URURT2URURV3URURV3URURURV3V3URV3T2URT2URT2T2T2URT2T2T2URT2URURURT2URT2T2T2URT2T2T2T2T0T0T0T2T0T0T2URT2URT2URURURURV3URV3V3V3URURURV3URURURV3URURV3V3URURSGSUSUSUXFXFXDXDXFXFXDXFXDXFXDXFXFXFXDXFXFXFXDXFXDXFXDXDXFXFXDXFXDXFXDXDXFXFXDXDXFXFXDXFXFXFXDXFXDXFXDXDXFXFXDXDT7T0T7T7T0T0T7T7", r = /* @__PURE__ */ "Africa/Abidjan.Africa/Accra.Africa/Addis_Ababa.Africa/Algiers.Africa/Asmara.Africa/Bamako.Africa/Bangui.Africa/Banjul.Africa/Bissau.Africa/Blantyre.Africa/Brazzaville.Africa/Bujumbura.Africa/Cairo.Africa/Casablanca.Africa/Ceuta.Africa/Conakry.Africa/Dakar.Africa/Dar_es_Salaam.Africa/Djibouti.Africa/Douala.Africa/El_Aaiun.Africa/Freetown.Africa/Gaborone.Africa/Harare.Africa/Johannesburg.Africa/Juba.Africa/Kampala.Africa/Khartoum.Africa/Kigali.Africa/Kinshasa.Africa/Lagos.Africa/Libreville.Africa/Lome.Africa/Luanda.Africa/Lubumbashi.Africa/Lusaka.Africa/Malabo.Africa/Maputo.Africa/Maseru.Africa/Mbabane.Africa/Mogadishu.Africa/Monrovia.Africa/Nairobi.Africa/Ndjamena.Africa/Niamey.Africa/Nouakchott.Africa/Ouagadougou.Africa/Porto-Novo.Africa/Sao_Tome.Africa/Tripoli.Africa/Tunis.Africa/Windhoek.America/Adak.America/Anchorage.America/Anguilla.America/Antigua.America/Araguaina.America/Argentina/Buenos_Aires.America/Argentina/Catamarca.America/Argentina/Cordoba.America/Argentina/Jujuy.America/Argentina/La_Rioja.America/Argentina/Mendoza.America/Argentina/Rio_Gallegos.America/Argentina/Salta.America/Argentina/San_Juan.America/Argentina/San_Luis.America/Argentina/Tucuman.America/Argentina/Ushuaia.America/Aruba.America/Asuncion.America/Atikokan.America/Bahia.America/Bahia_Banderas.America/Barbados.America/Belem.America/Belize.America/Blanc-Sablon.America/Boa_Vista.America/Bogota.America/Boise.America/Cambridge_Bay.America/Campo_Grande.America/Cancun.America/Caracas.America/Cayenne.America/Cayman.America/Chicago.America/Chihuahua.America/Ciudad_Juarez.America/Costa_Rica.America/Coyhaique.America/Creston.America/Cuiaba.America/Curacao.America/Danmarkshavn.America/Dawson.America/Dawson_Creek.America/Denver.America/Detroit.America/Dominica.America/Edmonton.America/Eirunepe.America/El_Salvador.America/Fort_Nelson.America/Fortaleza.America/Glace_Bay.America/Goose_Bay.America/Grand_Turk.America/Guadeloupe.America/Guatemala.America/Guayaquil.America/Guyana.America/Halifax.America/Havana.America/Hermosillo.America/Indiana/Indianapolis.America/Indiana/Knox.America/Indiana/Marengo.America/Indiana/Petersburg.America/Indiana/Tell_City.America/Indiana/Vincennes.America/Indiana/Winamac.America/Inuvik.America/Iqaluit.America/Jamaica.America/Juneau.America/Kentucky/Louisville.America/Kentucky/Monticello.America/Kralendijk.America/La_Paz.America/Lima.America/Los_Angeles.America/Lower_Princes.America/Maceio.America/Managua.America/Manaus.America/Marigot.America/Martinique.America/Matamoros.America/Mazatlan.America/Menominee.America/Merida.America/Mexico_City.America/Miquelon.America/Moncton.America/Monterrey.America/Montevideo.America/Montserrat.America/Nassau.America/New_York.America/Nome.America/Noronha.America/North_Dakota/Beulah.America/North_Dakota/New_Salem.America/Nuuk.America/Ojinaga.America/Panama.America/Paramaribo.America/Phoenix.America/Port-au-Prince.America/Port_of_Spain.America/Porto_Velho.America/Puerto_Rico.America/Punta_Arenas.America/Rankin_Inlet.America/Recife.America/Regina.America/Rio_Branco.America/Santarem.America/Santiago.America/Santo_Domingo.America/Sao_Paulo.America/Scoresbysund.America/Sitka.America/St_Barthelemy.America/St_Johns.America/St_Kitts.America/St_Lucia.America/St_Thomas.America/St_Vincent.America/Swift_Current.America/Tegucigalpa.America/Thule.America/Tijuana.America/Toronto.America/Tortola.America/Vancouver.America/Whitehorse.America/Winnipeg.America/Yakutat.Antarctica/Casey.Antarctica/Davis.Antarctica/DumontDUrville.Antarctica/Macquarie.Antarctica/Mawson.Antarctica/McMurdo.Antarctica/Rothera.Antarctica/Syowa.Antarctica/Troll.Antarctica/Vostok.Arctic/Longyearbyen.Asia/Aden.Asia/Almaty.Asia/Amman.Asia/Anadyr.Asia/Aqtau.Asia/Aqtobe.Asia/Ashgabat.Asia/Atyrau.Asia/Baghdad.Asia/Bahrain.Asia/Baku.Asia/Bangkok.Asia/Barnaul.Asia/Beirut.Asia/Bishkek.Asia/Brunei.Asia/Chita.Asia/Colombo.Asia/Damascus.Asia/Dhaka.Asia/Dili.Asia/Dubai.Asia/Dushanbe.Asia/Famagusta.Asia/Gaza.Asia/Hebron.Asia/Ho_Chi_Minh.Asia/Hong_Kong.Asia/Hovd.Asia/Irkutsk.Asia/Jakarta.Asia/Jayapura.Asia/Jerusalem.Asia/Kabul.Asia/Kamchatka.Asia/Karachi.Asia/Kathmandu.Asia/Khandyga.Asia/Kolkata.Asia/Krasnoyarsk.Asia/Kuala_Lumpur.Asia/Kuching.Asia/Kuwait.Asia/Macau.Asia/Magadan.Asia/Makassar.Asia/Manila.Asia/Muscat.Asia/Nicosia.Asia/Novokuznetsk.Asia/Novosibirsk.Asia/Omsk.Asia/Oral.Asia/Phnom_Penh.Asia/Pontianak.Asia/Pyongyang.Asia/Qatar.Asia/Qostanay.Asia/Qyzylorda.Asia/Riyadh.Asia/Sakhalin.Asia/Samarkand.Asia/Seoul.Asia/Shanghai.Asia/Singapore.Asia/Srednekolymsk.Asia/Taipei.Asia/Tashkent.Asia/Tbilisi.Asia/Tehran.Asia/Thimphu.Asia/Tokyo.Asia/Tomsk.Asia/Ulaanbaatar.Asia/Urumqi.Asia/Ust-Nera.Asia/Vientiane.Asia/Vladivostok.Asia/Yakutsk.Asia/Yangon.Asia/Yekaterinburg.Asia/Yerevan.Atlantic/Azores.Atlantic/Bermuda.Atlantic/Canary.Atlantic/Cape_Verde.Atlantic/Faroe.Atlantic/Madeira.Atlantic/Reykjavik.Atlantic/South_Georgia.Atlantic/St_Helena.Atlantic/Stanley.Australia/Adelaide.Australia/Brisbane.Australia/Broken_Hill.Australia/Darwin.Australia/Eucla.Australia/Hobart.Australia/Lord_Howe.Australia/Melbourne.Australia/Perth.Australia/Sydney.Etc/GMT.Etc/GMT+1.Etc/GMT+10.Etc/GMT+11.Etc/GMT+12.Etc/GMT+2.Etc/GMT+3.Etc/GMT+4.Etc/GMT+5.Etc/GMT+6.Etc/GMT+7.Etc/GMT+8.Etc/GMT+9.Etc/GMT-1.Etc/GMT-10.Etc/GMT-11.Etc/GMT-12.Etc/GMT-2.Etc/GMT-3.Etc/GMT-4.Etc/GMT-5.Etc/GMT-6.Etc/GMT-7.Etc/GMT-8.Etc/GMT-9.Etc/UTC.Europe/Amsterdam.Europe/Andorra.Europe/Astrakhan.Europe/Athens.Europe/Belgrade.Europe/Berlin.Europe/Bratislava.Europe/Brussels.Europe/Bucharest.Europe/Budapest.Europe/Busingen.Europe/Chisinau.Europe/Copenhagen.Europe/Dublin.Europe/Gibraltar.Europe/Guernsey.Europe/Helsinki.Europe/Isle_of_Man.Europe/Istanbul.Europe/Jersey.Europe/Kaliningrad.Europe/Kirov.Europe/Kyiv.Europe/Lisbon.Europe/Ljubljana.Europe/London.Europe/Luxembourg.Europe/Madrid.Europe/Malta.Europe/Mariehamn.Europe/Minsk.Europe/Monaco.Europe/Moscow.Europe/Oslo.Europe/Paris.Europe/Podgorica.Europe/Prague.Europe/Riga.Europe/Rome.Europe/Samara.Europe/San_Marino.Europe/Sarajevo.Europe/Saratov.Europe/Simferopol.Europe/Skopje.Europe/Sofia.Europe/Stockholm.Europe/Tallinn.Europe/Tirane.Europe/Ulyanovsk.Europe/Vaduz.Europe/Vienna.Europe/Vilnius.Europe/Volgograd.Europe/Warsaw.Europe/Zagreb.Europe/Zurich.Indian/Antananarivo.Indian/Chagos.Indian/Christmas.Indian/Cocos.Indian/Comoro.Indian/Kerguelen.Indian/Mahe.Indian/Maldives.Indian/Mauritius.Indian/Mayotte.Indian/Reunion.Pacific/Apia.Pacific/Auckland.Pacific/Bougainville.Pacific/Chatham.Pacific/Chuuk.Pacific/Easter.Pacific/Efate.Pacific/Fakaofo.Pacific/Fiji.Pacific/Funafuti.Pacific/Galapagos.Pacific/Gambier.Pacific/Guadalcanal.Pacific/Guam.Pacific/Honolulu.Pacific/Kanton.Pacific/Kiritimati.Pacific/Kosrae.Pacific/Kwajalein.Pacific/Majuro.Pacific/Marquesas.Pacific/Midway.Pacific/Nauru.Pacific/Niue.Pacific/Norfolk.Pacific/Noumea.Pacific/Pago_Pago.Pacific/Palau.Pacific/Pitcairn.Pacific/Pohnpei.Pacific/Port_Moresby.Pacific/Rarotonga.Pacific/Saipan.Pacific/Tahiti.Pacific/Tarawa.Pacific/Tongatapu.Pacific/Wake.Pacific/Wallis".split(".");
		if (t = +t, !(-90 <= (e = +e) && e <= 90 && -180 <= t && t <= 180)) throw RangeError("invalid coordinates");
		if (90 <= e) return "Etc/GMT";
		for (var i = -1, a = 48 * (180 + t) / 360.00000000000006, o = 24 * (90 - e) / 180.00000000000003, s = 0 | a, c = 0 | o, l = 96 * c + 2 * s, l = 56 * n.charCodeAt(l) + n.charCodeAt(l + 1) - 1995; l + r.length < 3136;) l = 56 * n.charCodeAt(l = 8 * (i = i + l + 1) + 4 * (c = 0 | (o = 2 * (o - c) % 2)) + 2 * (s = 0 | (a = 2 * (a - s) % 2)) + 2304) + n.charCodeAt(l + 1) - 1995;
		return r[l + r.length - 3136];
	}
	t !== void 0 && (t.exports = n);
})), Eo, Do;
function Oo() {
	return Eo ? Promise.resolve() : (Do ??= Promise.resolve().then(() => /* @__PURE__ */ c(To(), 1)).then((e) => {
		let t = e.default ?? e;
		typeof t == "function" && (Eo = t);
	}, (e) => {
		console.warn("Time-zone table failed to load; using nautical zones.", e), Do = void 0;
	}), Do);
}
// src/engine/profiles.ts
var ko = "Maxar Intelligence", Ao = "Planet", jo = "Airbus", Mo = [
	{
		norad: [40697],
		displayName: "Sentinel-2A",
		operator: "ESA / Copernicus",
		category: "open-optical",
		swathKm: 290,
		resolutionM: 10,
		daylightOnly: !0,
		stac: {
			collection: "sentinel-2-l2a",
			platform: "sentinel-2a"
		},
		blurb: "Copernicus multispectral imager: 13 bands, 10 m pixels, a 290 km swath."
	},
	{
		norad: [42063],
		displayName: "Sentinel-2B",
		operator: "ESA / Copernicus",
		category: "open-optical",
		swathKm: 290,
		resolutionM: 10,
		daylightOnly: !0,
		stac: {
			collection: "sentinel-2-l2a",
			platform: "sentinel-2b"
		},
		blurb: "Copernicus multispectral imager: 13 bands, 10 m pixels, a 290 km swath."
	},
	{
		norad: [60989],
		displayName: "Sentinel-2C",
		operator: "ESA / Copernicus",
		category: "open-optical",
		swathKm: 290,
		resolutionM: 10,
		daylightOnly: !0,
		stac: {
			collection: "sentinel-2-l2a",
			platform: "sentinel-2c"
		},
		blurb: "Copernicus multispectral imager: 13 bands, 10 m pixels, a 290 km swath."
	},
	{
		norad: [39084],
		displayName: "Landsat 8",
		operator: "USGS / NASA",
		category: "open-optical",
		swathKm: 185,
		resolutionM: 30,
		daylightOnly: !0,
		stac: {
			collection: "landsat-c2-l2",
			platform: "landsat-8"
		},
		blurb: "Operational Land Imager: 30 m colour and 15 m panchromatic pixels across a 185 km swath."
	},
	{
		norad: [49260],
		displayName: "Landsat 9",
		operator: "USGS / NASA",
		category: "open-optical",
		swathKm: 185,
		resolutionM: 30,
		daylightOnly: !0,
		stac: {
			collection: "landsat-c2-l2",
			platform: "landsat-9"
		},
		blurb: "Operational Land Imager 2: 30 m colour and 15 m panchromatic pixels across a 185 km swath."
	},
	{
		norad: [43013],
		displayName: "NOAA-20",
		operator: "NOAA",
		category: "weather-leo",
		swathKm: 3040,
		resolutionM: 375,
		gibs: {
			collection: "gibs-viirs-noaa20",
			layer: "VIIRS_NOAA20_CorrectedReflectance_TrueColor",
			kind: "daily"
		},
		blurb: "Its VIIRS imager sweeps a 3,040 km swath, covering the whole planet twice a day."
	},
	{
		norad: [54234],
		displayName: "NOAA-21",
		operator: "NOAA",
		category: "weather-leo",
		swathKm: 3040,
		resolutionM: 375,
		gibs: {
			collection: "gibs-viirs-noaa21",
			layer: "VIIRS_NOAA21_CorrectedReflectance_TrueColor",
			kind: "daily"
		},
		blurb: "Its VIIRS imager sweeps a 3,040 km swath, covering the whole planet twice a day."
	},
	{
		norad: [37849],
		displayName: "Suomi NPP",
		operator: "NASA / NOAA",
		category: "weather-leo",
		swathKm: 3040,
		resolutionM: 375,
		gibs: {
			collection: "gibs-viirs-snpp",
			layer: "VIIRS_SNPP_CorrectedReflectance_TrueColor",
			kind: "daily"
		},
		blurb: "The first VIIRS imager in orbit, sweeping a 3,040 km swath since 2011."
	},
	{
		norad: [25994],
		displayName: "Terra",
		operator: "NASA",
		category: "weather-leo",
		swathKm: 2330,
		resolutionM: 250,
		gibs: {
			collection: "gibs-modis-terra",
			layer: "MODIS_Terra_CorrectedReflectance_TrueColor",
			kind: "daily"
		},
		blurb: "Its MODIS imager has watched the whole planet, 2,330 km at a time, since 1999."
	},
	{
		norad: [27424],
		displayName: "Aqua",
		operator: "NASA",
		category: "weather-leo",
		swathKm: 2330,
		resolutionM: 250,
		gibs: {
			collection: "gibs-modis-aqua",
			layer: "MODIS_Aqua_CorrectedReflectance_TrueColor",
			kind: "daily"
		},
		blurb: "Its MODIS imager has watched the whole planet, 2,330 km at a time, since 2002."
	},
	{
		norad: [38771],
		displayName: "MetOp-B",
		operator: "EUMETSAT",
		category: "weather-leo",
		swathKm: 2900,
		resolutionM: 1100,
		blurb: "European polar weather satellite; its AVHRR imager covers a 2,900 km swath at 1.1 km."
	},
	{
		norad: [43689],
		displayName: "MetOp-C",
		operator: "EUMETSAT",
		category: "weather-leo",
		swathKm: 2900,
		resolutionM: 1100,
		blurb: "European polar weather satellite; its AVHRR imager covers a 2,900 km swath at 1.1 km."
	},
	{
		norad: [41335],
		displayName: "Sentinel-3A",
		operator: "ESA / EUMETSAT",
		category: "weather-leo",
		swathKm: 1270,
		resolutionM: 300,
		blurb: "Its OLCI instrument images land and ocean colour in 21 bands across a 1,270 km swath."
	},
	{
		norad: [43437],
		displayName: "Sentinel-3B",
		operator: "ESA / EUMETSAT",
		category: "weather-leo",
		swathKm: 1270,
		resolutionM: 300,
		blurb: "Its OLCI instrument images land and ocean colour in 21 bands across a 1,270 km swath."
	},
	{
		namePattern: "^FENGYUN 3[DFH]$",
		operator: "CMA",
		category: "weather-leo",
		swathKm: 2900,
		resolutionM: 250,
		blurb: "Chinese polar weather satellite; its MERSI imager covers a 2,900 km swath."
	},
	{
		namePattern: "^FENGYUN 3E$",
		operator: "CMA",
		category: "weather-leo",
		swathKm: 2900,
		blurb: "Chinese dawn–dusk orbit weather satellite with a low-light MERSI imager."
	},
	{
		norad: [60133],
		displayName: "GOES-19",
		operator: "NOAA",
		category: "weather-geo",
		resolutionM: 500,
		operational: !0,
		cadenceMin: 10,
		gibs: {
			collection: "gibs-goes-east",
			layer: "GOES-East_ABI_GeoColor",
			kind: "subdaily"
		},
		frames: "goes-east",
		scan: {
			from: "north",
			minutes: 10
		},
		blurb: "GOES-East: images the full disk of the Americas every 10 minutes."
	},
	{
		norad: [51850],
		displayName: "GOES-18",
		operator: "NOAA",
		category: "weather-geo",
		resolutionM: 500,
		operational: !0,
		cadenceMin: 10,
		gibs: {
			collection: "gibs-goes-west",
			layer: "GOES-West_ABI_GeoColor",
			kind: "subdaily"
		},
		frames: "goes-west",
		scan: {
			from: "north",
			minutes: 10
		},
		blurb: "GOES-West: images the full disk of the Pacific and the Americas every 10 minutes."
	},
	{
		norad: [41866],
		displayName: "GOES-16",
		operator: "NOAA",
		category: "weather-geo",
		operational: !1,
		cadenceMin: 10,
		blurb: "The former GOES-East, kept in orbit as a standby spare."
	},
	{
		norad: [43226],
		displayName: "GOES-17",
		operator: "NOAA",
		category: "weather-geo",
		operational: !1,
		cadenceMin: 10,
		blurb: "The former GOES-West, kept in orbit as a standby spare."
	},
	{
		norad: [41836],
		displayName: "Himawari-9",
		operator: "JMA",
		category: "weather-geo",
		resolutionM: 500,
		operational: !0,
		cadenceMin: 10,
		gibs: {
			collection: "gibs-himawari",
			layer: "Himawari_AHI_Band3_Red_Visible_1km",
			kind: "subdaily"
		},
		frames: "himawari",
		scan: {
			from: "north",
			minutes: 10
		},
		blurb: "Japan’s weather satellite: images the full disk of Asia and the Pacific every 10 minutes."
	},
	{
		norad: [40267],
		displayName: "Himawari-8",
		operator: "JMA",
		category: "weather-geo",
		operational: !1,
		cadenceMin: 10,
		blurb: "Backup to Himawari-9."
	},
	{
		norad: [54743],
		displayName: "Meteosat-12",
		operator: "EUMETSAT",
		category: "weather-geo",
		resolutionM: 500,
		operational: !0,
		cadenceMin: 10,
		frames: "meteosat-0deg",
		scan: {
			from: "south",
			minutes: 10
		},
		blurb: "The first third-generation Meteosat (MTG-I1): images Europe and Africa every 10 minutes."
	},
	{
		norad: [28912],
		displayName: "Meteosat-9",
		operator: "EUMETSAT",
		category: "weather-geo",
		resolutionM: 1e3,
		operational: !0,
		cadenceMin: 15,
		frames: "meteosat-iodc",
		scan: {
			from: "south",
			minutes: 12.5
		},
		blurb: "Covers the Indian Ocean region, imaging the full disk every 15 minutes."
	},
	{
		norad: [38552],
		displayName: "Meteosat-10",
		operator: "EUMETSAT",
		category: "weather-geo",
		operational: !1,
		cadenceMin: 15,
		blurb: "Second-generation Meteosat; not counted here as a full-disk imager of this place."
	},
	{
		norad: [40732],
		displayName: "Meteosat-11",
		operator: "EUMETSAT",
		category: "weather-geo",
		operational: !1,
		cadenceMin: 15,
		blurb: "Second-generation Meteosat; not counted here as a full-disk imager of this place."
	},
	{
		norad: [100530],
		displayName: "MTG-I2",
		operator: "EUMETSAT",
		category: "weather-geo",
		operational: !1,
		cadenceMin: 10,
		blurb: "Second third-generation Meteosat imager; not yet the operational service."
	},
	{
		norad: [43823],
		displayName: "GEO-KOMPSAT-2A",
		operator: "KMA",
		category: "weather-geo",
		resolutionM: 500,
		operational: !0,
		cadenceMin: 10,
		blurb: "Korea’s weather satellite: images the full disk every 10 minutes."
	},
	{
		norad: [48808],
		displayName: "Fengyun-4B",
		operator: "CMA",
		category: "weather-geo",
		resolutionM: 500,
		operational: !0,
		cadenceMin: 15,
		blurb: "China’s operational geostationary weather satellite: images the full disk every 15 minutes."
	},
	{
		norad: [41882],
		displayName: "Fengyun-4A",
		operator: "CMA",
		category: "weather-geo",
		operational: !1,
		cadenceMin: 15,
		blurb: "Older Chinese geostationary imager, not counted as the primary service."
	},
	{
		norad: [67246],
		displayName: "Fengyun-4C",
		operator: "CMA",
		category: "weather-geo",
		operational: !1,
		cadenceMin: 15,
		blurb: "Newest Chinese geostationary imager; not yet the operational service."
	},
	{
		norad: [41752],
		displayName: "INSAT-3DR",
		operator: "ISRO",
		category: "weather-geo",
		resolutionM: 1e3,
		operational: !0,
		cadenceMin: 30,
		blurb: "Indian weather satellite: images the full disk every 30 minutes."
	},
	{
		norad: [58990],
		displayName: "INSAT-3DS",
		operator: "ISRO",
		category: "weather-geo",
		resolutionM: 1e3,
		operational: !0,
		cadenceMin: 30,
		blurb: "Indian weather satellite: images the full disk every 30 minutes."
	},
	{
		norad: [39216],
		displayName: "INSAT-3D",
		operator: "ISRO",
		category: "weather-geo",
		operational: !1,
		cadenceMin: 30,
		blurb: "Older Indian weather satellite, not counted as an operational imager."
	},
	{
		norad: [44903],
		displayName: "Elektro-L 3",
		operator: "Roscosmos",
		category: "weather-geo",
		resolutionM: 1e3,
		operational: !0,
		cadenceMin: 30,
		blurb: "Russian geostationary weather satellite: images the full disk every 30 minutes."
	},
	{
		norad: [55506],
		displayName: "Elektro-L 4",
		operator: "Roscosmos",
		category: "weather-geo",
		resolutionM: 1e3,
		operational: !0,
		cadenceMin: 30,
		blurb: "Russian geostationary weather satellite: images the full disk every 30 minutes."
	},
	{
		norad: [41105],
		displayName: "Elektro-L 2",
		operator: "Roscosmos",
		category: "weather-geo",
		operational: !1,
		cadenceMin: 30,
		blurb: "Older Russian geostationary weather satellite, not counted as an operational imager."
	},
	{
		norad: [67756],
		displayName: "Elektro-L 5",
		operator: "Roscosmos",
		category: "weather-geo",
		operational: !1,
		cadenceMin: 30,
		blurb: "Newest Russian geostationary weather satellite; not yet counted as operational."
	},
	{
		norad: [32060],
		displayName: "WorldView-1",
		operator: ko,
		category: "commercial-optical",
		resolutionM: .5,
		maxOffNadirDeg: 40,
		daylightOnly: !0,
		blurb: "Panchromatic imager with 50 cm pixels that can point well off its ground track."
	},
	{
		norad: [35946],
		displayName: "WorldView-2",
		operator: ko,
		category: "commercial-optical",
		resolutionM: .46,
		maxOffNadirDeg: 40,
		daylightOnly: !0,
		blurb: "Eight-band imager with 46 cm panchromatic pixels."
	},
	{
		norad: [40115],
		displayName: "WorldView-3",
		operator: ko,
		category: "commercial-optical",
		resolutionM: .31,
		maxOffNadirDeg: 40,
		daylightOnly: !0,
		blurb: "Imager with 31 cm panchromatic pixels and 16 spectral bands."
	},
	{
		norad: [33331],
		displayName: "GeoEye-1",
		operator: ko,
		category: "commercial-optical",
		resolutionM: .41,
		maxOffNadirDeg: 40,
		daylightOnly: !0,
		blurb: "Imager with 41 cm panchromatic pixels, in orbit since 2008."
	},
	{
		norad: [
			59625,
			59626,
			60452,
			60453,
			62900,
			62901
		],
		namePattern: "^LEGION \\d+$",
		operator: ko,
		category: "commercial-optical",
		resolutionM: .3,
		maxOffNadirDeg: 40,
		daylightOnly: !0,
		blurb: "One of Maxar’s WorldView Legion imagers, with roughly 30 cm pixels."
	},
	{
		namePattern: "^SKYSAT-",
		operator: Ao,
		category: "commercial-optical",
		resolutionM: .5,
		maxOffNadirDeg: 30,
		daylightOnly: !0,
		blurb: "Agile Planet imager with roughly 50 cm pixels; it is tasked to point at specific targets."
	},
	{
		namePattern: "^PELICAN-",
		operator: Ao,
		category: "commercial-optical",
		resolutionM: .5,
		maxOffNadirDeg: 45,
		daylightOnly: !0,
		blurb: "Planet’s newer agile high-resolution imager."
	},
	{
		namePattern: "^FLOCK ",
		operator: Ao,
		category: "commercial-optical",
		resolutionM: 3,
		swathKm: 32,
		daylightOnly: !0,
		blurb: "A Planet SuperDove cubesat; the fleet images most of Earth’s land every day at about 3 m."
	},
	{
		namePattern: "^GLOBAL-\\d+$",
		operator: "BlackSky",
		category: "commercial-optical",
		resolutionM: 1,
		maxOffNadirDeg: 30,
		daylightOnly: !0,
		blurb: "A BlackSky rapid-revisit imager with roughly 1 m pixels or better."
	},
	{
		norad: [38012],
		displayName: "Pléiades 1A",
		operator: jo,
		category: "commercial-optical",
		resolutionM: .5,
		maxOffNadirDeg: 30,
		daylightOnly: !0,
		blurb: "Agile imager delivering 50 cm panchromatic products."
	},
	{
		norad: [39019],
		displayName: "Pléiades 1B",
		operator: jo,
		category: "commercial-optical",
		resolutionM: .5,
		maxOffNadirDeg: 30,
		daylightOnly: !0,
		blurb: "Agile imager delivering 50 cm panchromatic products."
	},
	{
		norad: [48268, 49070],
		namePattern: "^PLEIADES NEO \\d+$",
		operator: jo,
		category: "commercial-optical",
		resolutionM: .3,
		maxOffNadirDeg: 45,
		daylightOnly: !0,
		blurb: "Agile imager with 30 cm native pixels."
	},
	{
		norad: [38755],
		displayName: "SPOT 6",
		operator: jo,
		category: "commercial-optical",
		resolutionM: 1.5,
		maxOffNadirDeg: 30,
		daylightOnly: !0,
		blurb: "Wide-area imager with 1.5 m panchromatic pixels and a 60 km swath."
	},
	{
		norad: [40053],
		displayName: "SPOT 7",
		operator: "Azercosmos",
		category: "commercial-optical",
		resolutionM: 1.5,
		maxOffNadirDeg: 30,
		daylightOnly: !0,
		blurb: "Twin of SPOT 6, operated by Azerbaijan as Azersky."
	},
	{
		norad: [38338],
		displayName: "KOMPSAT-3",
		operator: "KARI",
		category: "commercial-optical",
		resolutionM: .7,
		maxOffNadirDeg: 30,
		daylightOnly: !0,
		blurb: "Korean imager with 70 cm panchromatic pixels."
	},
	{
		norad: [40536],
		displayName: "KOMPSAT-3A",
		operator: "KARI",
		category: "commercial-optical",
		resolutionM: .55,
		maxOffNadirDeg: 30,
		daylightOnly: !0,
		blurb: "Korean imager with 55 cm panchromatic pixels and an infrared channel."
	},
	{
		namePattern: "^JILIN",
		operator: "Chang Guang Satellite",
		category: "commercial-optical",
		resolutionM: .75,
		maxOffNadirDeg: 30,
		daylightOnly: !0,
		blurb: "Part of China’s Jilin-1 commercial constellation, with sub-metre imagers."
	},
	{
		namePattern: "^SUPERVIEW(-1 |\\sNEO-1 |\\sNEO-3 )",
		operator: "Siwei",
		category: "commercial-optical",
		resolutionM: .5,
		maxOffNadirDeg: 30,
		daylightOnly: !0,
		blurb: "Chinese commercial imager with roughly 50 cm pixels or better."
	},
	{
		namePattern: "^GAOFEN-1( 0[2-4])?$",
		operator: "CNSA",
		category: "commercial-optical",
		resolutionM: 2,
		swathKm: 60,
		daylightOnly: !0,
		blurb: "Chinese government imager with 2 m panchromatic and 16 m wide-field cameras."
	},
	{
		namePattern: "^GAOFEN-6$",
		operator: "CNSA",
		category: "commercial-optical",
		resolutionM: 2,
		swathKm: 90,
		daylightOnly: !0,
		blurb: "Chinese government imager with 2 m panchromatic and 16 m wide-field cameras."
	},
	{
		namePattern: "^GAOFEN-2$",
		operator: "CNSA",
		category: "commercial-optical",
		resolutionM: .8,
		maxOffNadirDeg: 30,
		daylightOnly: !0,
		blurb: "Chinese government imager with 80 cm panchromatic pixels."
	},
	{
		namePattern: "^GAOFEN-7$",
		operator: "CNSA",
		category: "commercial-optical",
		resolutionM: .65,
		swathKm: 20,
		daylightOnly: !0,
		blurb: "Chinese government stereo-mapping imager with sub-metre pixels."
	},
	{
		namePattern: "^GAOFEN-(9|11|14) 0\\d$",
		operator: "CNSA",
		category: "commercial-optical",
		maxOffNadirDeg: 30,
		daylightOnly: !0,
		blurb: "Chinese government high-resolution optical satellite; its specifications are not published."
	},
	{
		norad: [
			39634,
			62261,
			66315
		],
		namePattern: "^SENTINEL-1[A-Z]$",
		operator: "ESA / Copernicus",
		category: "radar",
		swathKm: 250,
		resolutionM: 20,
		maxOffNadirDeg: 40,
		blurb: "Copernicus C-band radar that publishes every image: a 250 km swath to one side at 20 m, through cloud, day or night.",
		openArchive: !0
	},
	{
		namePattern: "^ICEYE-",
		operator: "ICEYE",
		category: "radar",
		resolutionM: .5,
		maxOffNadirDeg: 35,
		blurb: "Small X-band radar satellite that can be tasked to image through cloud, day or night."
	},
	{
		namePattern: "^CAPELLA-",
		operator: "Capella Space",
		category: "radar",
		resolutionM: .5,
		maxOffNadirDeg: 45,
		blurb: "X-band radar satellite with roughly 50 cm spotlight imagery, day or night."
	},
	{
		namePattern: "^UMBRA-",
		operator: "Umbra",
		category: "radar",
		resolutionM: .25,
		maxOffNadirDeg: 45,
		blurb: "X-band radar satellite with spotlight imagery down to about 25 cm."
	},
	{
		namePattern: "^STRIX-",
		operator: "Synspective",
		category: "radar",
		resolutionM: 1,
		maxOffNadirDeg: 40,
		blurb: "Japanese small X-band radar satellite."
	},
	{
		namePattern: "^QPS-SAR-",
		operator: "iQPS",
		category: "radar",
		resolutionM: .5,
		maxOffNadirDeg: 40,
		blurb: "Japanese small X-band radar satellite."
	},
	{
		norad: [39227],
		displayName: "KOMPSAT-5",
		operator: "KARI",
		category: "radar",
		resolutionM: 1,
		maxOffNadirDeg: 40,
		blurb: "Korean X-band radar satellite with 1 m spotlight imagery."
	},
	{
		norad: [31698],
		displayName: "TerraSAR-X",
		operator: "DLR / Airbus",
		category: "radar",
		resolutionM: 1,
		maxOffNadirDeg: 40,
		blurb: "German X-band radar satellite, imaging since 2007."
	},
	{
		norad: [36605],
		displayName: "TanDEM-X",
		operator: "DLR / Airbus",
		category: "radar",
		resolutionM: 1,
		maxOffNadirDeg: 40,
		blurb: "Flies in close formation with TerraSAR-X to map Earth’s topography by radar."
	},
	{
		namePattern: "^(COSMO-SKYMED|CSG-)\\s?\\d$",
		operator: "ASI",
		category: "radar",
		resolutionM: 1,
		maxOffNadirDeg: 40,
		blurb: "Italian X-band radar satellite of the COSMO-SkyMed system."
	},
	{
		norad: [43215],
		displayName: "PAZ",
		operator: "Hisdesat",
		category: "radar",
		resolutionM: 1,
		maxOffNadirDeg: 40,
		blurb: "Spanish X-band radar satellite."
	},
	{
		norad: [32382],
		displayName: "RADARSAT-2",
		operator: "MDA",
		category: "radar",
		resolutionM: 1,
		maxOffNadirDeg: 45,
		blurb: "Canadian C-band radar satellite, imaging since 2007."
	},
	{
		namePattern: "^RCM-\\d$",
		operator: "CSA",
		category: "radar",
		resolutionM: 3,
		maxOffNadirDeg: 40,
		blurb: "One of three satellites of the Canadian RADARSAT Constellation Mission."
	},
	{
		norad: [43641, 46265],
		namePattern: "^SAOCOM 1[AB]$",
		operator: "CONAE",
		category: "radar",
		resolutionM: 10,
		maxOffNadirDeg: 40,
		blurb: "Argentine L-band radar satellite that also measures soil moisture."
	},
	{
		norad: [39766],
		displayName: "ALOS-2",
		operator: "JAXA",
		category: "radar",
		resolutionM: 3,
		maxOffNadirDeg: 40,
		blurb: "Japanese L-band radar satellite, imaging since 2014."
	},
	{
		norad: [60182],
		displayName: "ALOS-4",
		operator: "JAXA",
		category: "radar",
		resolutionM: 3,
		maxOffNadirDeg: 40,
		blurb: "Japanese L-band radar satellite, successor to ALOS-2."
	},
	{
		norad: [65053],
		displayName: "NISAR",
		operator: "NASA / ISRO",
		category: "radar",
		swathKm: 242,
		maxOffNadirDeg: 40,
		blurb: "Dual-band radar that maps a 242 km swath to measure how the ground moves."
	},
	{
		namePattern: "^SUPERVIEW NEO-2 ",
		operator: "Siwei",
		category: "radar",
		maxOffNadirDeg: 40,
		blurb: "Chinese commercial X-band radar satellite."
	},
	{
		namePattern: "^GAOFEN-3( 0[23])?$",
		operator: "CNSA",
		category: "radar",
		resolutionM: 1,
		maxOffNadirDeg: 45,
		blurb: "Chinese government C-band radar satellite."
	},
	{
		namePattern: "^GAOFEN-12 0\\d$",
		operator: "CNSA",
		category: "radar",
		maxOffNadirDeg: 40,
		blurb: "Chinese government radar satellite; its specifications are not published."
	},
	{
		norad: [25544],
		displayName: "ISS",
		operator: "NASA / Roscosmos / ESA / JAXA / CSA",
		category: "crewed",
		blurb: "The International Space Station, continuously crewed since November 2000."
	},
	{
		norad: [48274],
		displayName: "Tiangong",
		operator: "CMSA",
		category: "crewed",
		blurb: "China’s space station, built around the Tianhe core module launched in 2021."
	}
], No = /* @__PURE__ */ new Map(), Po = [];
for (let e of Mo) {
	for (let t of e.norad ?? []) No.set(t, e);
	e.namePattern && Po.push({
		re: new RegExp(e.namePattern, "i"),
		profile: e
	});
}
function Fo(e, t) {
	let n = No.get(e);
	if (n) return n;
	if (t) {
		for (let { re: e, profile: n } of Po) if (e.test(t)) return n;
	}
}
function Io(e) {
	let t = e.trim().toLowerCase();
	for (let e of Mo) if (e.stac && e.stac.platform === t && e.norad?.length === 1) return e.norad[0];
}
function Lo(e) {
	for (let t of Mo) if (t.gibs && t.gibs.collection === e && t.norad?.length === 1) return t.norad[0];
}
var Ro = {
	SKYSAT: "SkySat",
	FLOCK: "Flock",
	PELICAN: "Pelican",
	LEGION: "WorldView Legion",
	CAPELLA: "Capella",
	UMBRA: "Umbra",
	STRIX: "StriX",
	JILIN: "Jilin",
	GAOFEN: "Gaofen",
	KUANFU: "Kuanfu",
	SUPERVIEW: "SuperView",
	NEO: "Neo",
	PLEIADES: "Pléiades",
	FENGYUN: "Fengyun",
	GLOBAL: "BlackSky Global",
	OBJECT: "Object",
	SKYMED: "SkyMed"
};
function zo(e, t) {
	return t?.displayName ? t.displayName : t ? e.replace(/\s*\(.*\)\s*$/, "").trim().split(/(\s+|-)/).map((e) => Ro[e.toUpperCase()] ?? e).join("") : e;
}
// src/engine/catalog.ts
var Bo = {
	norad: 0,
	name: 1,
	intlDes: 2,
	epoch: 3,
	meanMotion: 4,
	ecc: 5,
	incl: 6,
	raan: 7,
	argp: 8,
	meanAnomaly: 9,
	bstar: 10,
	ndot: 11,
	nddot: 12
};
function Vo(e) {
	let t = e[Bo.epoch];
	return Date.parse(/[zZ]|[+-]\d\d:\d\d$/.test(t) ? t : `${t}Z`);
}
var Ho = (e) => e.v === 2;
function Uo(e) {
	let t = Array(e.length), n = 0;
	for (let r = 0; r < e.length; r++) t[r] = n += e[r];
	return t;
}
function Wo(e, t) {
	return new Date(Math.round(e + t * 1e3)).toISOString().slice(0, -1);
}
function Go(e) {
	if (!Ho(e)) return e.rows;
	let t = Uo(e.norad), n = Date.parse(e.fetchedAt), r = Array(t.length);
	for (let i = 0; i < t.length; i++) r[i] = [
		t[i],
		e.name[i] ?? "",
		"",
		Wo(n, e.epoch[i]),
		e.n[i],
		e.e[i],
		e.i[i],
		e.raan[i],
		e.argp[i],
		e.ma[i],
		e.bstar[i],
		e.ndot[i],
		e.nddot[i]
	];
	return r;
}
function Ko(e) {
	let t = e;
	return !!t && typeof t == "object" && typeof t.fetchedAt == "string" && (Array.isArray(t.rows) || t.v === 2 && Array.isArray(t.norad) && Array.isArray(t.epoch));
}
function qo(e) {
	if (!Array.isArray(e) || e.length < 13 || !Number.isInteger(e[Bo.norad]) || typeof e[Bo.name] != "string") return !1;
	for (let t = 4; t <= 12; t++) if (!Number.isFinite(e[t])) return !1;
	let t = e[Bo.ecc];
	return e[Bo.meanMotion] > 0 && t >= 0 && t < 1 && Number.isFinite(Vo(e));
}
var Jo = new Map(Mo.map((e, t) => [e, t])), Yo = (e) => String(e ?? "").replace(/\n/g, " ");
function Xo(e) {
	let t = {
		fetchedAt: e.fetchedAt,
		source: e.source,
		rows: Go(e)
	}, n = t.rows.length, r = new Int32Array(n), i = new Float64Array(n * 9), a = new Float64Array(n), o = new Int16Array(n), s = [], c = [], l = [], u = [], d = [], f = /* @__PURE__ */ new Set(), p = 0, m = 0;
	for (let e of t.rows) {
		if (!qo(e) || f.has(e[Bo.norad])) {
			m++;
			continue;
		}
		let t = e[Bo.norad];
		f.add(t);
		let n = Yo(e[Bo.name]).trim(), h = Fo(t, n);
		r[p] = t;
		for (let t = 0; t < 9; t++) i[p * 9 + t] = e[4 + t];
		a[p] = Vo(e), o[p] = h ? Jo.get(h) ?? -1 : -1, h && h.category !== "other" && u.push(p), s.push(n), c.push(Yo(e[Bo.intlDes])), l.push(Yo(e[Bo.epoch])), d.push(e), p++;
	}
	return {
		fetchedAt: t.fetchedAt,
		source: t.source,
		skipped: m,
		count: p,
		norad: r.slice(0, p),
		num: i.slice(0, p * 9),
		epochMs: a.slice(0, p),
		names: s.join("\n"),
		intlDes: c.join("\n"),
		epochs: l.join("\n"),
		profile: o.slice(0, p),
		featured: Int32Array.from(u),
		rows: d
	};
}
var Zo = class {
	ids;
	sorted;
	map;
	constructor(e) {
		this.ids = e;
		let t = !0;
		for (let n = 1; n < e.length && t; n++) t = e[n] > e[n - 1];
		this.sorted = t;
	}
	get(e) {
		let t = this.ids;
		if (!this.sorted) {
			if (!this.map) {
				this.map = /* @__PURE__ */ new Map();
				for (let e = 0; e < t.length; e++) this.map.set(t[e], e);
			}
			return this.map.get(e);
		}
		let n = 0, r = t.length - 1;
		for (; n <= r;) {
			let i = n + r >>> 1, a = t[i];
			if (a === e) return i;
			a < e ? n = i + 1 : r = i - 1;
		}
	}
	has(e) {
		return this.get(e) !== void 0;
	}
}, Qo = class {
	p;
	indexOf;
	nameCol;
	intlCol;
	epochCol;
	infos;
	rowCache;
	all;
	featuredInfos;
	constructor(e) {
		this.p = e, this.indexOf = new Zo(e.norad), this.infos = Array(e.count), this.rowCache = e.rows ? e.rows : Array(e.count);
	}
	names() {
		return this.nameCol ??= this.p.count ? this.p.names.split("\n") : [];
	}
	missingNames() {
		return this.names().some((e) => !e);
	}
	profileAt(e) {
		let t = this.p.profile[e];
		return t >= 0 ? Mo[t] : void 0;
	}
	categoryAt(e) {
		return this.profileAt(e)?.category ?? "other";
	}
	info(e) {
		let t = this.infos[e];
		if (!t) {
			let n = this.names()[e], r = this.profileAt(e), i = this.p.norad[e];
			t = {
				norad: i,
				name: n,
				displayName: n ? zo(n, r) : `NORAD ${i}`,
				category: r?.category ?? "other",
				profile: r
			}, this.infos[e] = t;
		}
		return t;
	}
	addNames(e) {
		let t = this.names(), n = 0;
		for (let r = 0; r < this.p.count; r++) {
			if (t[r]) continue;
			let i = e.get(this.p.norad[r]);
			if (!i) continue;
			t[r] = i, n++;
			let a = this.infos[r];
			a && Object.assign(a, {
				name: i,
				displayName: zo(i, a.profile)
			});
			let o = this.rowCache[r];
			o && (o[Bo.name] = i);
		}
		return n;
	}
	row(e) {
		let t = this.rowCache[e];
		if (!t) {
			this.intlCol ??= this.p.intlDes.split("\n"), this.epochCol ??= this.p.epochs.split("\n");
			let n = e * 9, r = this.p.num;
			t = [
				this.p.norad[e],
				this.names()[e],
				this.intlCol[e],
				this.epochCol[e],
				r[n],
				r[n + 1],
				r[n + 2],
				r[n + 3],
				r[n + 4],
				r[n + 5],
				r[n + 6],
				r[n + 7],
				r[n + 8]
			], this.rowCache[e] = t;
		}
		return t;
	}
	featured() {
		return this.featuredInfos ??= Array.from(this.p.featured, (e) => this.info(e));
	}
	sats() {
		if (!this.all) {
			let e = Array(this.p.count);
			for (let t = 0; t < this.p.count; t++) e[t] = this.info(t);
			this.all = e;
		}
		return this.all;
	}
	async warm(e = 2e3) {
		for (let t = 0; t < this.p.count; t++) this.info(t), t % e === e - 1 && await $o();
	}
};
function $o() {
	let e = globalThis.scheduler;
	return e?.yield ? e.yield() : new Promise((e) => setTimeout(e, 0));
}
var es = class extends Map {
	store;
	constructor(e) {
		super(), this.store = e;
	}
	get(e) {
		let t = this.store.indexOf.get(e);
		return t === void 0 ? void 0 : this.store.info(t);
	}
	has(e) {
		return this.store.indexOf.has(e);
	}
	get size() {
		return this.store.p.count;
	}
	fill() {
		if (super.size !== this.store.p.count) for (let e of this.store.sats()) super.set(e.norad, e);
	}
	forEach(e, t) {
		this.fill(), super.forEach(e, t);
	}
	entries() {
		return this.fill(), super.entries();
	}
	keys() {
		return this.fill(), super.keys();
	}
	values() {
		return this.fill(), super.values();
	}
	[Symbol.iterator]() {
		return this.entries();
	}
}, ts, ns, rs, is = /* @__PURE__ */ new WeakMap(), as = 0, os = () => as;
function ss(e) {
	as++;
	let t = new Qo(e), n = {
		fetchedAt: e.fetchedAt,
		source: e.source,
		count: e.count,
		get sats() {
			return t.sats();
		},
		byNorad: new es(t),
		skipped: e.skipped
	};
	return t.featured(), is.set(n, t), ts = n, ns = t, rs = Promise.resolve(n), n;
}
function cs(e) {
	return ss(Xo(e));
}
var ls = /* @__PURE__ */ new WeakMap();
function us(e) {
	return typeof Worker > "u" ? Promise.resolve(null) : new Promise((t, n) => {
		let r;
		try {
			r = new Worker(new URL(
				/* @vite-ignore */
				new URL("assets/elements.worker-CvNcktA2.js", import.meta.url).href,
				"" + import.meta.url
			), {
				type: "module",
				name: "catalog"
			});
		} catch {
			t(null);
			return;
		}
		let i = () => r.terminate();
		r.onmessage = (e) => {
			i();
			let r = e.data;
			r.type === "ok" ? t({
				payload: r.payload,
				elements: r.elements
			}) : n(Error(r.message));
		}, r.onerror = (e) => {
			e.preventDefault?.(), i(), t(null);
		}, r.onmessageerror = () => {
			i(), t(null);
		}, r.postMessage({
			type: "parse",
			buf: e
		}, [e]);
	});
}
async function ds(e) {
	let t;
	try {
		if (t = await fetch(e), !t.ok) throw Error("remote catalog unavailable");
	} catch (n) {
		if (e !== "https://raw.githubusercontent.com/dev-Armaan/satellites/main/public/data/catalog.json") throw n;
		t = await fetch("/groce-eye/history-engine/data/catalog.json");
	}
	if (!t.ok) throw Error(`Catalog request failed: HTTP ${t.status}`);
	return t;
}
function fs(e) {
	if (!Ko(e)) throw Error("Catalog file is malformed");
	return e;
}
function ps(e = "https://raw.githubusercontent.com/dev-Armaan/satellites/main/public/data/catalog.json", t) {
	if (!rs) {
		let t = (async () => {
			let t = await ds(e);
			if (typeof Worker < "u") {
				let n = await us(await t.arrayBuffer());
				if (n) {
					let e = ss(n.payload);
					return n.elements && ls.set(e, n.elements), ns?.warm(), e;
				}
				return cs(fs(await (await ds(e)).json()));
			}
			return cs(fs(await t.json()));
		})();
		rs = t, t.catch(() => {
			rs === t && (rs = void 0);
		});
	}
	if (!t) return rs;
	if (t.aborted) return Promise.reject(ms());
	let n = rs;
	return new Promise((e, r) => {
		let i = () => r(ms());
		t.addEventListener("abort", i, { once: !0 }), n.then(e, r).finally(() => t.removeEventListener("abort", i));
	});
}
function ms() {
	return new DOMException("Aborted", "AbortError");
}
function hs(e) {
	return ts?.byNorad.get(e);
}
function gs(e) {
	let t = ns?.indexOf.get(e);
	return t === void 0 ? void 0 : ns.row(t);
}
function _s(e = ts) {
	if (!e) return [];
	let t = is.get(e);
	return t ? t.featured() : e.sats.filter((e) => e.category !== "other");
}
// node_modules/satellite.js/dist/constants.js
var vs = Math.PI, ys = vs * 2, bs = vs / 180;
180 / vs;
var xs = 398600.8, Ss = 6378.135, Cs = 60 / Math.sqrt(Ss * Ss * Ss / xs), ws = Ss * Cs / 60, Ts = 1 / Cs, Es = .001082616, Ds = -253881e-11, Os = -165597e-11, ks = Ds / Es, As = 2 / 3, js = 1440 / (2 * vs);
// node_modules/satellite.js/dist/ext.js
function Ms(e, t) {
	let n = [
		31,
		e % 4 == 0 ? 29 : 28,
		31,
		30,
		31,
		30,
		31,
		31,
		30,
		31,
		30,
		31
	], r = Math.floor(t), i = 1, a = 0;
	for (; r > a + n[i - 1] && i < 12;) a += n[i - 1], i += 1;
	let o = i, s = r - a, c = (t - r) * 24, l = Math.floor(c);
	c = (c - l) * 60;
	let u = Math.floor(c);
	return {
		mon: o,
		day: s,
		hr: l,
		minute: u,
		sec: (c - u) * 60
	};
}
function Ns(e, t, n, r, i, a, o = 0) {
	return 367 * e - Math.floor(7 * (e + Math.floor((t + 9) / 12)) * .25) + Math.floor(275 * t / 9) + n + 1721013.5 + ((o / 6e4 + a / 60 + i) / 60 + r) / 24;
}
function Ps(e, t, n, r, i, a, o = 0) {
	if (e instanceof Date) {
		let t = e;
		return Ns(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate(), t.getUTCHours(), t.getUTCMinutes(), t.getUTCSeconds(), t.getUTCMilliseconds());
	}
	return Ns(e, t, n, r, i, a, o);
}
// node_modules/satellite.js/dist/propagation/dpper.js
function Fs(e, t) {
	let { e3: n, ee2: r, peo: i, pgho: a, pho: o, pinco: s, plo: c, se2: l, se3: u, sgh2: d, sgh3: f, sgh4: p, sh2: m, sh3: h, si2: g, si3: _, sl2: v, sl3: y, sl4: b, t: x, xgh2: S, xgh3: C, xgh4: w, xh2: T, xh3: E, xi2: D, xi3: O, xl2: k, xl3: ee, xl4: te, zmol: A, zmos: j } = e, { init: M, opsmode: N } = t, { ep: ne, inclp: re, nodep: P, argpp: F, mp: I } = t, L, R, ie, z, B, V, H, ae, oe, U, W, G, K, q, J, se, Y, ce, le, X, Z;
	Z = j + 119459e-10 * x, M === "y" && (Z = j), X = Z + .0335 * Math.sin(Z), Y = Math.sin(X), U = .5 * Y * Y - .25, W = -.5 * Y * Math.cos(X);
	let ue = l * U + u * W, de = g * U + _ * W, fe = v * U + y * W + b * Y, pe = d * U + f * W + p * Y, me = m * U + h * W;
	Z = A + .00015835218 * x, M === "y" && (Z = A), X = Z + .1098 * Math.sin(Z), Y = Math.sin(X), U = .5 * Y * Y - .25, W = -.5 * Y * Math.cos(X);
	let he = r * U + n * W, Q = D * U + O * W, $ = k * U + ee * W + te * Y, ge = S * U + C * W + w * Y, _e = T * U + E * W;
	return G = ue + he, J = de + Q, se = fe + $, K = pe + ge, q = me + _e, M === "n" && (G -= i, J -= s, se -= c, K -= a, q -= o, re += J, ne += G, z = Math.sin(re), ie = Math.cos(re), re >= .2 ? (q /= z, K -= ie * q, F += K, P += q, I += se) : (V = Math.sin(P), B = Math.cos(P), L = z * V, R = z * B, H = q * B + J * ie * V, ae = -q * V + J * ie * B, L += H, R += ae, P %= ys, P < 0 && N === "a" && (P += ys), ce = I + F + ie * P, oe = se + K - J * P * z, ce += oe, le = P, P = Math.atan2(L, R), P < 0 && N === "a" && (P += ys), Math.abs(le - P) > vs && (P < le ? P += ys : P -= ys), I += se, F = ce - I - ie * P)), {
		ep: ne,
		inclp: re,
		nodep: P,
		argpp: F,
		mp: I
	};
}
// node_modules/satellite.js/dist/propagation/dscom.js
function Is(e) {
	let { epoch: t, ep: n, argpp: r, tc: i, inclp: a, nodep: o, np: s } = e, c, l, u, d, f, p, m, h, g, _, v, y, b, x, S, C, w, T, E, D, O, k, ee, te, A, j, M, N, ne, re, P, F, I, L, R, ie, z, B, V, H, ae, oe, U, W, G, K, q, J, se, Y, ce, le, X, Z, ue, de, fe, pe, me, he, Q, $, ge, _e = .01675, ve = .0549, ye = s, be = n, xe = Math.sin(o), Se = Math.cos(o), Ce = Math.sin(r), we = Math.cos(r), Te = Math.sin(a), Ee = Math.cos(a), De = be * be, Oe = 1 - De, ke = Math.sqrt(Oe), Ae = t + 18261.5 + i / 1440, je = (4.523602 - .00092422029 * Ae) % ys, Me = Math.sin(je), Ne = Math.cos(je), Pe = .91375164 - .03568096 * Ne, Fe = Math.sqrt(1 - Pe * Pe), Ie = .089683511 * Me / Fe, Le = Math.sqrt(1 - Ie * Ie), Re = 5.8351514 + .001944368 * Ae, ze = .39785416 * Me / Fe, Be = Le * Ne + .91744867 * Ie * Me;
	ze = Math.atan2(ze, Be), ze += Re - je;
	let Ve = Math.cos(ze), He = Math.sin(ze);
	D = .1945905, O = -.98088458, te = .91744867, A = .39785416, k = Se, ee = xe, v = 29864797e-13;
	let Ue = 1 / ye, We = 0;
	for (; We < 2;) We += 1, c = D * k + O * te * ee, u = -O * k + D * te * ee, m = -D * ee + O * te * k, h = O * A, g = O * ee + D * te * k, _ = D * A, l = Ee * m + Te * h, d = Ee * g + Te * _, f = -Te * m + Ee * h, p = -Te * g + Ee * _, y = c * we + l * Ce, b = u * we + d * Ce, x = -c * Ce + l * we, S = -u * Ce + d * we, C = f * Ce, w = p * Ce, T = f * we, E = p * we, Q = 12 * y * y - 3 * x * x, $ = 24 * y * b - 6 * x * S, ge = 12 * b * b - 3 * S * S, le = 3 * (c * c + l * l) + Q * De, X = 6 * (c * u + l * d) + $ * De, Z = 3 * (u * u + d * d) + ge * De, ue = -6 * c * f + De * (-24 * y * T - 6 * x * C), de = -6 * (c * p + u * f) + De * (-24 * (b * T + y * E) + -6 * (x * w + S * C)), fe = -6 * u * p + De * (-24 * b * E - 6 * S * w), pe = 6 * l * f + De * (24 * y * C - 6 * x * T), me = 6 * (d * f + l * p) + De * (24 * (b * C + y * w) - 6 * (S * T + x * E)), he = 6 * d * p + De * (24 * b * w - 6 * S * E), le = le + le + Oe * Q, X = X + X + Oe * $, Z = Z + Z + Oe * ge, q = v * Ue, K = -.5 * q / ke, J = q * ke, G = -15 * be * J, se = y * x + b * S, Y = b * x + y * S, ce = b * S - y * x, We === 1 && (j = G, M = K, N = q, ne = J, re = se, P = Y, F = ce, I = le, L = X, R = Z, ie = ue, z = de, B = fe, V = pe, H = me, ae = he, oe = Q, U = $, W = ge, D = Ve, O = He, te = Pe, A = Fe, k = Le * Se + Ie * xe, ee = xe * Le - Se * Ie, v = 4.7968065e-7);
	let Ge = (4.7199672 + (.2299715 * Ae - Re)) % ys, Ke = (6.2565837 + .017201977 * Ae) % ys, qe = 2 * j * P, Je = 2 * j * F, Ye = 2 * M * z, Xe = 2 * M * (B - ie), Ze = -2 * N * L, Qe = -2 * N * (R - I), $e = -2 * N * (-21 - 9 * De) * _e, et = 2 * ne * U, tt = 2 * ne * (W - oe), nt = -18 * ne * _e, rt = -2 * M * H, it = -2 * M * (ae - V), at = 2 * G * Y, ot = 2 * G * ce, st = 2 * K * de, ct = 2 * K * (fe - ue), lt = -2 * q * X, ut = -2 * q * (Z - le), dt = -2 * q * (-21 - 9 * De) * ve, ft = 2 * J * $, pt = 2 * J * (ge - Q), mt = -18 * J * ve, ht = -2 * K * me, gt = -2 * K * (he - pe);
	return {
		snodm: xe,
		cnodm: Se,
		sinim: Te,
		cosim: Ee,
		sinomm: Ce,
		cosomm: we,
		day: Ae,
		e3: ot,
		ee2: at,
		em: be,
		emsq: De,
		gam: Re,
		peo: 0,
		pgho: 0,
		pho: 0,
		pinco: 0,
		plo: 0,
		rtemsq: ke,
		se2: qe,
		se3: Je,
		sgh2: et,
		sgh3: tt,
		sgh4: nt,
		sh2: rt,
		sh3: it,
		si2: Ye,
		si3: Xe,
		sl2: Ze,
		sl3: Qe,
		sl4: $e,
		s1: G,
		s2: K,
		s3: q,
		s4: J,
		s5: se,
		s6: Y,
		s7: ce,
		ss1: j,
		ss2: M,
		ss3: N,
		ss4: ne,
		ss5: re,
		ss6: P,
		ss7: F,
		sz1: I,
		sz2: L,
		sz3: R,
		sz11: ie,
		sz12: z,
		sz13: B,
		sz21: V,
		sz22: H,
		sz23: ae,
		sz31: oe,
		sz32: U,
		sz33: W,
		xgh2: ft,
		xgh3: pt,
		xgh4: mt,
		xh2: ht,
		xh3: gt,
		xi2: st,
		xi3: ct,
		xl2: lt,
		xl3: ut,
		xl4: dt,
		nm: ye,
		z1: le,
		z2: X,
		z3: Z,
		z11: ue,
		z12: de,
		z13: fe,
		z21: pe,
		z22: me,
		z23: he,
		z31: Q,
		z32: $,
		z33: ge,
		zmol: Ge,
		zmos: Ke
	};
}
// node_modules/satellite.js/dist/propagation/dsinit.js
function Ls(e) {
	let { cosim: t, argpo: n, s1: r, s2: i, s3: a, s4: o, s5: s, sinim: c, ss1: l, ss2: u, ss3: d, ss4: f, ss5: p, sz1: m, sz3: h, sz11: g, sz13: _, sz21: v, sz23: y, sz31: b, sz33: x, t: S, tc: C, gsto: w, mo: T, mdot: E, no: D, nodeo: O, nodedot: k, xpidot: ee, z1: te, z3: A, z11: j, z13: M, z21: N, z23: ne, z31: re, z33: P, ecco: F, eccsq: I } = e, { emsq: L, em: R, argpm: ie, inclm: z, mm: B, nm: V, nodem: H, irez: ae, atime: oe, d2201: U, d2211: W, d3210: G, d3222: K, d4410: q, d4422: J, d5220: se, d5232: Y, d5421: ce, d5433: le, dedt: X, didt: Z, dmdt: ue, dnodt: de, domdt: fe, del1: pe, del2: me, del3: he, xfact: Q, xlamo: $, xli: ge, xni: _e } = e, ve, ye, be, xe, Se, Ce, we, Te, Ee, De, Oe, ke, Ae, je, Me, Ne, Pe, Fe, Ie, Le, Re, ze, Be, Ve, He, Ue, We, Ge, Ke, qe, Je, Ye, Xe = .0043752690880113, Ze = .00015835218, Qe = 119459e-10;
	ae = 0, V < .0052359877 && V > .0034906585 && (ae = 1), V >= .00826 && V <= .00924 && R >= .5 && (ae = 2);
	let $e = l * Qe * p, et = u * Qe * (g + _), tt = -119459e-10 * d * (m + h - 14 - 6 * L), nt = f * Qe * (b + x - 6), rt = -119459e-10 * u * (v + y);
	(z < .052359877 || z > vs - .052359877) && (rt = 0), c !== 0 && (rt /= c);
	let it = nt - t * rt;
	X = $e + r * Ze * s, Z = et + i * Ze * (j + M), ue = tt - Ze * a * (te + A - 14 - 6 * L);
	let at = o * Ze * (re + P - 6), ot = -.00015835218 * i * (N + ne);
	(z < .052359877 || z > vs - .052359877) && (ot = 0), fe = it + at, de = rt, c !== 0 && (fe -= t / c * ot, de += ot / c);
	let st = (w + C * Xe) % ys;
	if (R += X * S, z += Z * S, ie += fe * S, H += de * S, B += ue * S, ae !== 0) {
		if (qe = (V / Cs) ** As, ae === 2) {
			Je = t * t;
			let e = R;
			R = F;
			let n = L;
			L = I, Ye = R * L, je = -.306 - (R - .64) * .44, R <= .65 ? (Me = 3.616 - 13.247 * R + 16.29 * L, Pe = -19.302 + 117.39 * R - 228.419 * L + 156.591 * Ye, Fe = -18.9068 + 109.7927 * R - 214.6334 * L + 146.5816 * Ye, Ie = -41.122 + 242.694 * R - 471.094 * L + 313.953 * Ye, Le = -146.407 + 841.88 * R - 1629.014 * L + 1083.435 * Ye, Re = -532.114 + 3017.977 * R - 5740.032 * L + 3708.276 * Ye) : (Me = -72.099 + 331.819 * R - 508.738 * L + 266.724 * Ye, Pe = -346.844 + 1582.851 * R - 2415.925 * L + 1246.113 * Ye, Fe = -342.585 + 1554.908 * R - 2366.899 * L + 1215.972 * Ye, Ie = -1052.797 + 4758.686 * R - 7193.992 * L + 3651.957 * Ye, Le = -3581.69 + 16178.11 * R - 24462.77 * L + 12422.52 * Ye, Re = R > .715 ? -5149.66 + 29936.92 * R - 54087.36 * L + 31324.56 * Ye : 1464.74 - 4664.75 * R + 3763.64 * L), R < .7 ? (Ve = -919.2277 + 4988.61 * R - 9064.77 * L + 5542.21 * Ye, ze = -822.71072 + 4568.6173 * R - 8491.4146 * L + 5337.524 * Ye, Be = -853.666 + 4690.25 * R - 8624.77 * L + 5341.4 * Ye) : (Ve = -37995.78 + 161616.52 * R - 229838.2 * L + 109377.94 * Ye, ze = -51752.104 + 218913.95 * R - 309468.16 * L + 146349.42 * Ye, Be = -40023.88 + 170470.89 * R - 242699.48 * L + 115605.82 * Ye), He = c * c, ve = .75 * (1 + 2 * t + Je), ye = 1.5 * He, xe = 1.875 * c * (1 - 2 * t - 3 * Je), Se = -1.875 * c * (1 + 2 * t - 3 * Je), we = 35 * He * ve, Te = 39.375 * He * He, Ee = 9.84375 * c * (He * (1 - 2 * t - 5 * Je) + .33333333 * (-2 + 4 * t + 6 * Je)), De = c * (4.92187512 * He * (-2 - 4 * t + 10 * Je) + 6.56250012 * (1 + 2 * t - 3 * Je)), Oe = 29.53125 * c * (2 - 8 * t + Je * (-12 + 8 * t + 10 * Je)), ke = 29.53125 * c * (-2 - 8 * t + Je * (12 + 8 * t - 10 * Je)), Ge = V * V, Ke = qe * qe, We = 3 * Ge * Ke, Ue = We * 17891679e-13, U = Ue * ve * je, W = Ue * ye * Me, We *= qe, Ue = We * 3.7393792e-7, G = Ue * xe * Pe, K = Ue * Se * Fe, We *= qe, Ue = 2 * We * 7.3636953e-9, q = Ue * we * Ie, J = Ue * Te * Le, We *= qe, Ue = We * 1.1428639e-7, se = Ue * Ee * Re, Y = Ue * De * Be, Ue = 2 * We * 2.1765803e-9, ce = Ue * Oe * ze, le = Ue * ke * Ve, $ = (T + O + O - (st + st)) % ys, Q = E + ue + 2 * (k + de - Xe) - D, R = e, L = n;
		}
		ae === 1 && (Ae = 1 + L * (-2.5 + .8125 * L), Pe = 1 + 2 * L, Ne = 1 + L * (-6 + 6.60937 * L), ve = .75 * (1 + t) * (1 + t), be = .9375 * c * c * (1 + 3 * t) - .75 * (1 + t), Ce = 1 + t, Ce = 1.875 * Ce * Ce * Ce, pe = 3 * V * V * qe * qe, me = 2 * pe * ve * Ae * 17891679e-13, he = 3 * pe * Ce * Ne * 2.2123015e-7 * qe, pe = pe * be * Pe * 21460748e-13 * qe, $ = (T + O + n - st) % ys, Q = E + ee + ue + fe + de - (D + Xe)), ge = $, _e = D, oe = 0, V = D + 0;
	}
	return {
		em: R,
		argpm: ie,
		inclm: z,
		mm: B,
		nm: V,
		nodem: H,
		irez: ae,
		atime: oe,
		d2201: U,
		d2211: W,
		d3210: G,
		d3222: K,
		d4410: q,
		d4422: J,
		d5220: se,
		d5232: Y,
		d5421: ce,
		d5433: le,
		dedt: X,
		didt: Z,
		dmdt: ue,
		dndt: 0,
		dnodt: de,
		domdt: fe,
		del1: pe,
		del2: me,
		del3: he,
		xfact: Q,
		xlamo: $,
		xli: ge,
		xni: _e
	};
}
// node_modules/satellite.js/dist/propagation/gstime.js
function Rs(e) {
	let t = (e - 2451545) / 36525, n = -62e-7 * t * t * t + .093104 * t * t + 3164400184.812866 * t + 67310.54841;
	return n = n * bs / 240 % ys, n < 0 && (n += ys), n;
}
function zs(e, t, n, r, i, a, o) {
	return e instanceof Date ? Rs(Ps(e)) : Rs(t === void 0 ? e : Ps(e, t, n, r, i, a, o));
}
// node_modules/satellite.js/dist/propagation/initl.js
function Bs(e) {
	let { ecco: t, epoch: n, inclo: r, opsmode: i } = e, { no: a } = e, o = t * t, s = 1 - o, c = Math.sqrt(s), l = Math.cos(r), u = l * l, d = (Cs / a) ** As, f = .75 * Es * (3 * u - 1) / (c * s), p = f / (d * d), m = d * (1 - p * p - p * (1 / 3 + 134 * p * p / 81));
	p = f / (m * m), a /= 1 + p;
	let h = (Cs / a) ** As, g = Math.sin(r), _ = h * s, v = 1 - 5 * u, y = -v - u - u, b = 1 / h, x = _ * _, S = h * (1 - t), C;
	if (i === "a") {
		let e = n - 7305, t = Math.floor(e + 1e-8), r = e - t, i = .017202791694070362, a = i + ys;
		C = (1.7321343856509375 + i * t + a * r + e * e * 5075514194322695e-30) % ys, C < 0 && (C += ys);
	} else C = zs(n + 2433281.5);
	return {
		no: a,
		method: "n",
		ainv: b,
		ao: h,
		con41: y,
		con42: v,
		cosio: l,
		cosio2: u,
		eccsq: o,
		omeosq: s,
		posq: x,
		rp: S,
		rteosq: c,
		sinio: g,
		gsto: C
	};
}
// node_modules/satellite.js/dist/propagation/dspace.js
function Vs(e) {
	let { irez: t, d2201: n, d2211: r, d3210: i, d3222: a, d4410: o, d4422: s, d5220: c, d5232: l, d5421: u, d5433: d, dedt: f, del1: p, del2: m, del3: h, didt: g, dmdt: _, dnodt: v, domdt: y, argpo: b, argpdot: x, t: S, tc: C, gsto: w, xfact: T, xlamo: E, no: D } = e, { atime: O, em: k, argpm: ee, inclm: te, xli: A, mm: j, xni: M, nodem: N, nm: ne } = e, re = .13130908, P = 2.8843198, F = .37448087, I = 5.7686396, L = .95240898, R = 1.8014998, ie = 1.050833, z = 4.4108898, B = 259200, V, H, ae, oe, U, W, G, K, q = 0, J = 0, se = (w + C * .0043752690880113) % ys;
	if (k += f * S, te += g * S, ee += y * S, N += v * S, j += _ * S, t !== 0) {
		(O === 0 || S * O <= 0 || Math.abs(S) < Math.abs(O)) && (O = 0, M = D, A = E), V = S > 0 ? 720 : -720;
		let e = 381;
		for (; e === 381;) t === 2 ? (K = b + x * O, ae = K + K, H = A + A, G = n * Math.sin(ae + A - I) + r * Math.sin(A - I) + i * Math.sin(K + A - L) + a * Math.sin(-K + A - L) + o * Math.sin(ae + H - R) + s * Math.sin(H - R) + c * Math.sin(K + A - ie) + l * Math.sin(-K + A - ie) + u * Math.sin(K + H - z) + d * Math.sin(-K + H - z), U = M + T, W = n * Math.cos(ae + A - I) + r * Math.cos(A - I) + i * Math.cos(K + A - L) + a * Math.cos(-K + A - L) + c * Math.cos(K + A - ie) + l * Math.cos(-K + A - ie) + 2 * (o * Math.cos(ae + H - R) + s * Math.cos(H - R) + u * Math.cos(K + H - z) + d * Math.cos(-K + H - z)), W *= U) : (G = p * Math.sin(A - re) + m * Math.sin(2 * (A - P)) + h * Math.sin(3 * (A - F)), U = M + T, W = p * Math.cos(A - re) + 2 * m * Math.cos(2 * (A - P)) + 3 * h * Math.cos(3 * (A - F)), W *= U), Math.abs(S - O) >= 720 ? e = 381 : (J = S - O, e = 0), e === 381 && (A += U * V + G * B, M += G * V + W * B, O += V);
		ne = M + G * J + W * J * J * .5, oe = A + U * J + G * J * J * .5, t === 1 ? (j = oe - N - ee + se, q = ne - D) : (j = oe - 2 * N + 2 * se, q = ne - D), ne = D + q;
	}
	return {
		atime: O,
		em: k,
		argpm: ee,
		inclm: te,
		xli: A,
		mm: j,
		xni: M,
		nodem: N,
		dndt: q,
		nm: ne
	};
}
// node_modules/satellite.js/dist/propagation/SatRec.js
var Hs;
(function(e) {
	e[e.None = 0] = "None", e[e.MeanEccentricityOutOfRange = 1] = "MeanEccentricityOutOfRange", e[e.MeanMotionBelowZero = 2] = "MeanMotionBelowZero", e[e.PerturbedEccentricityOutOfRange = 3] = "PerturbedEccentricityOutOfRange", e[e.SemiLatusRectumBelowZero = 4] = "SemiLatusRectumBelowZero", e[e.Decayed = 6] = "Decayed";
})(Hs ||= {});
// node_modules/satellite.js/dist/propagation/sgp4.js
function Us(e, t) {
	let n, r, i, a, o, s, c, l, u, d, f, p, m, h, g, _, v, y, b, x, S, C, w, T, E, D, O;
	e.t = t, e.error = Hs.None;
	let k = e.mo + e.mdot * e.t, ee = e.argpo + e.argpdot * e.t, te = e.nodeo + e.nodedot * e.t;
	u = ee, S = k;
	let A = e.t * e.t;
	if (w = te + e.nodecf * A, v = 1 - e.cc1 * e.t, y = e.bstar * e.cc4 * e.t, b = e.t2cof * A, e.isimp !== 1) {
		c = e.omgcof * e.t;
		let t = 1 + e.eta * Math.cos(k);
		s = e.xmcof * (t * t * t - e.delmo), _ = c + s, S = k + _, u = ee - _, p = A * e.t, m = p * e.t, v = v - e.d2 * A - e.d3 * p - e.d4 * m, y += e.bstar * e.cc5 * (Math.sin(S) - e.sinmao), b = b + e.t3cof * p + m * (e.t4cof + e.t * e.t5cof);
	}
	e.tempa = v, C = e.no;
	let j = e.ecco;
	if (x = e.inclo, e.method === "d") {
		h = e.t;
		let t = Vs({
			irez: e.irez,
			d2201: e.d2201,
			d2211: e.d2211,
			d3210: e.d3210,
			d3222: e.d3222,
			d4410: e.d4410,
			d4422: e.d4422,
			d5220: e.d5220,
			d5232: e.d5232,
			d5421: e.d5421,
			d5433: e.d5433,
			dedt: e.dedt,
			del1: e.del1,
			del2: e.del2,
			del3: e.del3,
			didt: e.didt,
			dmdt: e.dmdt,
			dnodt: e.dnodt,
			domdt: e.domdt,
			argpo: e.argpo,
			argpdot: e.argpdot,
			t: e.t,
			tc: h,
			gsto: e.gsto,
			xfact: e.xfact,
			xlamo: e.xlamo,
			no: e.no,
			atime: e.atime,
			em: j,
			argpm: u,
			inclm: x,
			xli: e.xli,
			mm: S,
			xni: e.xni,
			nodem: w,
			nm: C
		});
		({em: j, argpm: u, inclm: x, mm: S, nodem: w, nm: C} = t);
	}
	if (C <= 0) return e.error = Hs.MeanMotionBelowZero, null;
	let M = (Cs / C) ** As * v * v;
	if (C = Cs / M ** 1.5, j -= y, j >= 1 || j < -.001) return e.error = Hs.MeanEccentricityOutOfRange, null;
	j < 1e-6 && (j = 1e-6), S += e.no * b, E = S + u + w, w %= ys, u %= ys, E %= ys, S = (E - u - w) % ys;
	let N = {
		am: M,
		em: j,
		im: x,
		Om: w,
		om: u,
		mm: S,
		nm: C
	}, ne = Math.sin(x), re = Math.cos(x), P = j;
	if (T = x, d = u, O = w, D = S, a = ne, i = re, e.method === "d") {
		let t = Fs(e, {
			inclo: e.inclo,
			init: "n",
			ep: P,
			inclp: T,
			nodep: O,
			argpp: d,
			mp: D,
			opsmode: e.operationmode
		});
		if ({ep: P, nodep: O, argpp: d, mp: D} = t, T = t.inclp, T < 0 && (T = -T, O += vs, d -= vs), P < 0 || P > 1) return e.error = Hs.PerturbedEccentricityOutOfRange, null;
	}
	e.method === "d" && (a = Math.sin(T), i = Math.cos(T), e.aycof = -.5 * ks * a, e.xlcof = Math.abs(i + 1) > 15e-13 ? -.25 * ks * a * (3 + 5 * i) / (1 + i) : -.25 * ks * a * (3 + 5 * i) / 15e-13);
	let F = P * Math.cos(d);
	_ = 1 / (M * (1 - P * P));
	let I = P * Math.sin(d) + _ * e.aycof, L = (D + d + O + _ * e.xlcof * F - O) % ys;
	l = L, g = 9999.9;
	let R = 1;
	for (; Math.abs(g) >= 1e-12 && R <= 10;) r = Math.sin(l), n = Math.cos(l), g = 1 - n * F - r * I, g = (L - I * n + F * r - l) / g, Math.abs(g) >= .95 && (g = g > 0 ? .95 : -.95), l += g, R += 1;
	let ie = F * n + I * r, z = F * r - I * n, B = F * F + I * I, V = M * (1 - B);
	if (V < 0) return e.error = Hs.SemiLatusRectumBelowZero, null;
	let H = M * (1 - ie), ae = Math.sqrt(M) * z / H, oe = Math.sqrt(V) / H, U = Math.sqrt(1 - B);
	_ = z / (1 + U);
	let W = M / H * (r - I - F * _), G = M / H * (n - F + I * _);
	f = Math.atan2(W, G);
	let K = (G + G) * W, q = 1 - 2 * W * W;
	_ = 1 / V;
	let J = .5 * Es * _, se = J * _;
	e.method === "d" && (o = i * i, e.con41 = 3 * o - 1, e.x1mth2 = 1 - o, e.x7thm1 = 7 * o - 1);
	let Y = H * (1 - 1.5 * se * U * e.con41) + .5 * J * e.x1mth2 * q;
	if (Y < 1) return e.error = Hs.Decayed, null;
	f -= .25 * se * e.x7thm1 * K;
	let ce = O + 1.5 * se * i * K, le = T + 1.5 * se * i * a * q, X = ae - C * J * e.x1mth2 * K / Cs, Z = oe + C * J * (e.x1mth2 * q + 1.5 * e.con41) / Cs, ue = Math.sin(f), de = Math.cos(f), fe = Math.sin(ce), pe = Math.cos(ce), me = Math.sin(le), he = Math.cos(le), Q = -fe * he, $ = pe * he, ge = Q * ue + pe * de, _e = $ * ue + fe * de, ve = me * ue, ye = Q * de - pe * ue, be = $ * de - fe * ue, xe = me * de;
	return {
		position: {
			x: Y * ge * Ss,
			y: Y * _e * Ss,
			z: Y * ve * Ss
		},
		velocity: {
			x: (X * ge + Z * ye) * ws,
			y: (X * _e + Z * be) * ws,
			z: (X * ve + Z * xe) * ws
		},
		meanElements: N
	};
}
// node_modules/satellite.js/dist/propagation/sgp4init.js
function Ws(e, t) {
	let { opsmode: n, satn: r, epoch: i, xbstar: a, xecco: o, xargpo: s, xinclo: c, xmo: l, xno: u, xnodeo: d } = t, f, p, m, h, g, _, v, y, b, x, S, C, w, T, E, D, O, k, ee, te, A, j, M, N, ne, re, P, F, I, L, R, ie, z, B, V, H, ae, oe, U, W, G, K, q, J, se, Y, ce, le, X, Z, ue, de, fe, pe, me, he, Q = e;
	Q.isimp = 0, Q.method = "n", Q.aycof = 0, Q.con41 = 0, Q.cc1 = 0, Q.cc4 = 0, Q.cc5 = 0, Q.d2 = 0, Q.d3 = 0, Q.d4 = 0, Q.delmo = 0, Q.eta = 0, Q.argpdot = 0, Q.omgcof = 0, Q.sinmao = 0, Q.t = 0, Q.t2cof = 0, Q.t3cof = 0, Q.t4cof = 0, Q.t5cof = 0, Q.x1mth2 = 0, Q.x7thm1 = 0, Q.mdot = 0, Q.nodedot = 0, Q.xlcof = 0, Q.xmcof = 0, Q.nodecf = 0, Q.irez = 0, Q.d2201 = 0, Q.d2211 = 0, Q.d3210 = 0, Q.d3222 = 0, Q.d4410 = 0, Q.d4422 = 0, Q.d5220 = 0, Q.d5232 = 0, Q.d5421 = 0, Q.d5433 = 0, Q.dedt = 0, Q.del1 = 0, Q.del2 = 0, Q.del3 = 0, Q.didt = 0, Q.dmdt = 0, Q.dnodt = 0, Q.domdt = 0, Q.e3 = 0, Q.ee2 = 0, Q.peo = 0, Q.pgho = 0, Q.pho = 0, Q.pinco = 0, Q.plo = 0, Q.se2 = 0, Q.se3 = 0, Q.sgh2 = 0, Q.sgh3 = 0, Q.sgh4 = 0, Q.sh2 = 0, Q.sh3 = 0, Q.si2 = 0, Q.si3 = 0, Q.sl2 = 0, Q.sl3 = 0, Q.sl4 = 0, Q.gsto = 0, Q.xfact = 0, Q.xgh2 = 0, Q.xgh3 = 0, Q.xgh4 = 0, Q.xh2 = 0, Q.xh3 = 0, Q.xi2 = 0, Q.xi3 = 0, Q.xl2 = 0, Q.xl3 = 0, Q.xl4 = 0, Q.xlamo = 0, Q.zmol = 0, Q.zmos = 0, Q.atime = 0, Q.xli = 0, Q.xni = 0, Q.bstar = a, Q.ecco = o, Q.argpo = s, Q.inclo = c, Q.mo = l, Q.no = u, Q.nokozai = u, Q.nodeo = d, Q.operationmode = n;
	let $ = 78 / Ss + 1, ge = 42 / Ss, _e = ge * ge * ge * ge;
	Q.init = "y", Q.t = 0;
	let ve = Bs({
		satn: r,
		ecco: Q.ecco,
		epoch: i,
		inclo: Q.inclo,
		no: Q.no,
		method: Q.method,
		opsmode: Q.operationmode
	}), { ao: ye, con42: be, cosio: xe, cosio2: Se, eccsq: Ce, omeosq: we, posq: Te, rp: Ee, rteosq: De, sinio: Oe } = ve;
	if (Q.no = ve.no, Q.con41 = ve.con41, Q.gsto = ve.gsto, Q.a = (Q.no * Ts) ** (-2 / 3), Q.alta = Q.a * (1 + Q.ecco) - 1, Q.altp = Q.a * (1 - Q.ecco) - 1, Q.error = 0, we >= 0 || Q.no >= 0) {
		if (Q.isimp = 0, Ee < 220 / 6378.135 + 1 && (Q.isimp = 1), P = $, A = _e, k = (Ee - 1) * Ss, k < 156) {
			P = k - 78, k < 98 && (P = 20);
			let e = (120 - P) / Ss;
			A = e * e * e * e, P = P / Ss + 1;
		}
		ee = 1 / Te, Y = 1 / (ye - P), Q.eta = ye * Q.ecco * Y, C = Q.eta * Q.eta, S = Q.ecco * Q.eta, te = Math.abs(1 - C), _ = A * Y ** 4, v = _ / te ** 3.5, h = v * Q.no * (ye * (1 + 1.5 * C + S * (4 + C)) + .375 * Es * Y / te * Q.con41 * (8 + 3 * C * (8 + C))), Q.cc1 = Q.bstar * h, g = 0, Q.ecco > 1e-4 && (g = -2 * _ * Y * ks * Q.no * Oe / Q.ecco), Q.x1mth2 = 1 - Se, Q.cc4 = 2 * Q.no * v * ye * we * (Q.eta * (2 + .5 * C) + Q.ecco * (.5 + 2 * C) - Es * Y / (ye * te) * (-3 * Q.con41 * (1 - 2 * S + C * (1.5 - .5 * S)) + .75 * Q.x1mth2 * (2 * C - S * (1 + C)) * Math.cos(2 * Q.argpo))), Q.cc5 = 2 * v * ye * we * (1 + 2.75 * (C + S) + S * C), y = Se * Se, q = 1.5 * Es * ee * Q.no, J = .5 * q * Es * ee, se = -.46875 * Os * ee * ee * Q.no, Q.mdot = Q.no + .5 * q * De * Q.con41 + .0625 * J * De * (13 - 78 * Se + 137 * y), Q.argpdot = -.5 * q * be + .0625 * J * (7 - 114 * Se + 395 * y) + se * (3 - 36 * Se + 49 * y), le = -q * xe, Q.nodedot = le + (.5 * J * (4 - 19 * Se) + 2 * se * (3 - 7 * Se)) * xe, ce = Q.argpdot + Q.nodedot, Q.omgcof = Q.bstar * g * Math.cos(Q.argpo), Q.xmcof = 0, Q.ecco > 1e-4 && (Q.xmcof = -As * _ * Q.bstar / S), Q.nodecf = 3.5 * we * le * Q.cc1, Q.t2cof = 1.5 * Q.cc1, Q.xlcof = Math.abs(xe + 1) > 15e-13 ? -.25 * ks * Oe * (3 + 5 * xe) / (1 + xe) : -.25 * ks * Oe * (3 + 5 * xe) / 15e-13, Q.aycof = -.5 * ks * Oe;
		let e = 1 + Q.eta * Math.cos(Q.mo);
		if (Q.delmo = e * e * e, Q.sinmao = Math.sin(Q.mo), Q.x7thm1 = 7 * Se - 1, 2 * vs / Q.no >= 225) {
			Q.method = "d", Q.isimp = 1, G = 0, E = Q.inclo;
			let e = Is({
				epoch: i,
				ep: Q.ecco,
				argpp: Q.argpo,
				tc: G,
				inclp: Q.inclo,
				nodep: Q.nodeo,
				np: Q.no,
				e3: Q.e3,
				ee2: Q.ee2,
				peo: Q.peo,
				pgho: Q.pgho,
				pho: Q.pho,
				pinco: Q.pinco,
				plo: Q.plo,
				se2: Q.se2,
				se3: Q.se3,
				sgh2: Q.sgh2,
				sgh3: Q.sgh3,
				sgh4: Q.sgh4,
				sh2: Q.sh2,
				sh3: Q.sh3,
				si2: Q.si2,
				si3: Q.si3,
				sl2: Q.sl2,
				sl3: Q.sl3,
				sl4: Q.sl4,
				xgh2: Q.xgh2,
				xgh3: Q.xgh3,
				xgh4: Q.xgh4,
				xh2: Q.xh2,
				xh3: Q.xh3,
				xi2: Q.xi2,
				xi3: Q.xi3,
				xl2: Q.xl2,
				xl3: Q.xl3,
				xl4: Q.xl4,
				zmol: Q.zmol,
				zmos: Q.zmos
			});
			Q.e3 = e.e3, Q.ee2 = e.ee2, Q.peo = e.peo, Q.pgho = e.pgho, Q.pho = e.pho, Q.pinco = e.pinco, Q.plo = e.plo, Q.se2 = e.se2, Q.se3 = e.se3, Q.sgh2 = e.sgh2, Q.sgh3 = e.sgh3, Q.sgh4 = e.sgh4, Q.sh2 = e.sh2, Q.sh3 = e.sh3, Q.si2 = e.si2, Q.si3 = e.si3, Q.sl2 = e.sl2, Q.sl3 = e.sl3, Q.sl4 = e.sl4, {sinim: p, cosim: f, em: b, emsq: x, s1: j, s2: M, s3: N, s4: ne, s5: re, ss1: F, ss2: I, ss3: L, ss4: R, ss5: ie, sz1: z, sz3: B, sz11: V, sz13: H, sz21: ae, sz23: oe, sz31: U, sz33: W} = e, Q.xgh2 = e.xgh2, Q.xgh3 = e.xgh3, Q.xgh4 = e.xgh4, Q.xh2 = e.xh2, Q.xh3 = e.xh3, Q.xi2 = e.xi2, Q.xi3 = e.xi3, Q.xl2 = e.xl2, Q.xl3 = e.xl3, Q.xl4 = e.xl4, Q.zmol = e.zmol, Q.zmos = e.zmos, {nm: O, z1: X, z3: Z, z11: ue, z13: de, z21: fe, z23: pe, z31: me, z33: he} = e;
			let t = Fs(Q, {
				inclo: E,
				init: Q.init,
				ep: Q.ecco,
				inclp: Q.inclo,
				nodep: Q.nodeo,
				argpp: Q.argpo,
				mp: Q.mo,
				opsmode: Q.operationmode
			});
			Q.ecco = t.ep, Q.inclo = t.inclp, Q.nodeo = t.nodep, Q.argpo = t.argpp, Q.mo = t.mp, w = 0, T = 0, D = 0;
			let n = Ls({
				cosim: f,
				emsq: x,
				argpo: Q.argpo,
				s1: j,
				s2: M,
				s3: N,
				s4: ne,
				s5: re,
				sinim: p,
				ss1: F,
				ss2: I,
				ss3: L,
				ss4: R,
				ss5: ie,
				sz1: z,
				sz3: B,
				sz11: V,
				sz13: H,
				sz21: ae,
				sz23: oe,
				sz31: U,
				sz33: W,
				t: Q.t,
				tc: G,
				gsto: Q.gsto,
				mo: Q.mo,
				mdot: Q.mdot,
				no: Q.no,
				nodeo: Q.nodeo,
				nodedot: Q.nodedot,
				xpidot: ce,
				z1: X,
				z3: Z,
				z11: ue,
				z13: de,
				z21: fe,
				z23: pe,
				z31: me,
				z33: he,
				ecco: Q.ecco,
				eccsq: Ce,
				em: b,
				argpm: w,
				inclm: E,
				mm: D,
				nm: O,
				nodem: T,
				irez: Q.irez,
				atime: Q.atime,
				d2201: Q.d2201,
				d2211: Q.d2211,
				d3210: Q.d3210,
				d3222: Q.d3222,
				d4410: Q.d4410,
				d4422: Q.d4422,
				d5220: Q.d5220,
				d5232: Q.d5232,
				d5421: Q.d5421,
				d5433: Q.d5433,
				dedt: Q.dedt,
				didt: Q.didt,
				dmdt: Q.dmdt,
				dnodt: Q.dnodt,
				domdt: Q.domdt,
				del1: Q.del1,
				del2: Q.del2,
				del3: Q.del3,
				xfact: Q.xfact,
				xlamo: Q.xlamo,
				xli: Q.xli,
				xni: Q.xni
			});
			Q.irez = n.irez, Q.atime = n.atime, Q.d2201 = n.d2201, Q.d2211 = n.d2211, Q.d3210 = n.d3210, Q.d3222 = n.d3222, Q.d4410 = n.d4410, Q.d4422 = n.d4422, Q.d5220 = n.d5220, Q.d5232 = n.d5232, Q.d5421 = n.d5421, Q.d5433 = n.d5433, Q.dedt = n.dedt, Q.didt = n.didt, Q.dmdt = n.dmdt, Q.dnodt = n.dnodt, Q.domdt = n.domdt, Q.del1 = n.del1, Q.del2 = n.del2, Q.del3 = n.del3, Q.xfact = n.xfact, Q.xlamo = n.xlamo, Q.xli = n.xli, Q.xni = n.xni;
		}
		Q.isimp !== 1 && (m = Q.cc1 * Q.cc1, Q.d2 = 4 * ye * Y * m, K = Q.d2 * Y * Q.cc1 / 3, Q.d3 = (17 * ye + P) * K, Q.d4 = .5 * K * ye * Y * (221 * ye + 31 * P) * Q.cc1, Q.t3cof = Q.d2 + 2 * m, Q.t4cof = .25 * (3 * Q.d3 + Q.cc1 * (12 * Q.d2 + 10 * m)), Q.t5cof = .2 * (3 * Q.d4 + 12 * Q.cc1 * Q.d3 + 6 * Q.d2 * Q.d2 + 15 * m * (2 * Q.d2 + m)));
	}
	Us(Q, 0), Q.init = "n";
}
// node_modules/satellite.js/dist/io.js
function Gs(e, t) {
	Ws(e, {
		opsmode: t,
		satn: e.satnum,
		epoch: e.jdsatepoch - 2433281.5,
		xbstar: e.bstar,
		xecco: e.ecco,
		xargpo: e.argpo,
		xinclo: e.inclo,
		xmo: e.mo,
		xno: e.no,
		xnodeo: e.nodeo
	});
}
function Ks(e, t = "i") {
	let n = e.NORAD_CAT_ID.toString(), r = new Date(e.EPOCH.endsWith("Z") ? e.EPOCH : `${e.EPOCH}Z`), i = r.getUTCFullYear(), a = Number(i.toString().slice(-2)), o = (r.valueOf() - new Date(Date.UTC(i, 0, 1, 0, 0, 0)).valueOf()) / 864e5 + 1, s = Number(e.MEAN_MOTION_DOT), c = Number(e.MEAN_MOTION_DDOT);
	s /= js * 1440, c /= js * 1440 * 1440;
	let l = Number(e.BSTAR), u = Number(e.INCLINATION) * bs, d = Number(e.RA_OF_ASC_NODE) * bs, f = Number(e.ECCENTRICITY), p = Number(e.ARG_OF_PERICENTER) * bs, m = Number(e.MEAN_ANOMALY) * bs, h = Number(e.MEAN_MOTION) / js, { mon: g, day: _, hr: v, minute: y, sec: b } = Ms(i, o), x = Ps(i, g, _, v, y, b), S = {
		error: 0,
		satnum: n,
		epochyr: a,
		epochdays: o,
		ndot: s,
		nddot: c,
		bstar: l,
		inclo: u,
		nodeo: d,
		ecco: f,
		argpo: p,
		mo: m,
		no: h,
		jdsatepoch: x
	};
	return Gs(S, t), S;
}
// node_modules/satellite.js/dist/transforms.js
function qs(e, t) {
	let n = 6378.137, r = Math.sqrt(e.x * e.x + e.y * e.y), i = 21.384685799999716 / n, a = 2 * i - i * i, o = ((Math.atan2(e.y, e.x) - t + vs) % ys + ys) % ys - vs, s = 0, c = Math.atan2(e.z, Math.sqrt(e.x * e.x + e.y * e.y)), l = 0;
	for (; s++ < 20;) l = 1 / Math.sqrt(1 - Math.sin(c) * Math.sin(c) * a), c = Math.atan2(e.z + n * l * a * Math.sin(c), r);
	let u = r / Math.cos(c) - n * l;
	return {
		longitude: o,
		latitude: c,
		height: u
	};
}
3 * Float64Array.BYTES_PER_ELEMENT;
// src/engine/sgp4.ts
function Js(e) {
	return {
		OBJECT_NAME: e[Bo.name],
		OBJECT_ID: e[Bo.intlDes],
		EPOCH: e[Bo.epoch],
		MEAN_MOTION: e[Bo.meanMotion],
		ECCENTRICITY: e[Bo.ecc],
		INCLINATION: e[Bo.incl],
		RA_OF_ASC_NODE: e[Bo.raan],
		ARG_OF_PERICENTER: e[Bo.argp],
		MEAN_ANOMALY: e[Bo.meanAnomaly],
		EPHEMERIS_TYPE: 0,
		CLASSIFICATION_TYPE: "U",
		NORAD_CAT_ID: e[Bo.norad],
		ELEMENT_SET_NO: 999,
		BSTAR: e[Bo.bstar],
		MEAN_MOTION_DOT: e[Bo.ndot],
		MEAN_MOTION_DDOT: e[Bo.nddot]
	};
}
function Ys(e) {
	try {
		let t = Ks(Js(e));
		return t.error ? null : t;
	} catch {
		return null;
	}
}
var Xs = /* @__PURE__ */ new Map(), Zs = -1;
function Qs(e) {
	Zs !== os() && (Xs.clear(), Zs = os());
	let t = Xs.get(e);
	if (t !== void 0) return t;
	let n = gs(e), r = n ? Ys(n) : null;
	return Xs.set(e, r), r;
}
// src/engine/geometry.ts
var $s = l;
function ec(e, t) {
	let n = e / $s, r = $s + t;
	return Math.atan2($s * Math.sin(n), r - $s * Math.cos(n)) * p;
}
function tc(e, t) {
	let n = e / $s, r = $s + t;
	return Math.atan2(r * Math.cos(n) - $s, r * Math.sin(n)) * p;
}
function nc(e, t) {
	let n = $s + t, r = n / $s * Math.sin(e * f), i = Math.acos($s / n);
	return r >= 1 ? i * $s : Math.min(i, Math.asin(r) - e * f) * $s;
}
function rc(e, t) {
	let n = $s + t, r = e * f;
	return (Math.acos($s / n * Math.cos(r)) - r) * $s;
}
function ic(e, t, n) {
	let [r, i, a] = v(n), [o, s, c] = _(r, i, a, n), l = e * f, u = t * f, d = Math.cos(l), m = (o * d * Math.cos(u) + s * d * Math.sin(u) + c * Math.sin(l)) / Math.hypot(o, s, c);
	return Math.asin(Math.max(-1, Math.min(1, m))) * p;
}
// src/engine/propagate.ts
function ac(e, t) {
	return (h(t) - e.jdsatepoch) * 1440;
}
function oc(e, t) {
	let n = Us(e, ac(e, t));
	if (!n) return null;
	let r = n.position, i = n.velocity;
	return !Number.isFinite(r.x) || !Number.isFinite(r.y) || !Number.isFinite(r.z) ? null : {
		x: r.x,
		y: r.y,
		z: r.z,
		vx: i.x,
		vy: i.y,
		vz: i.z
	};
}
function sc(e, t) {
	let n = oc(e, t);
	if (!n) return null;
	let r = qs(n, g(t));
	return {
		lat: r.latitude * p,
		lon: r.longitude * p,
		altKm: r.height
	};
}
function cc(e, t) {
	let n = oc(e, t);
	if (!n) return null;
	let r = g(t), i = Math.cos(r), a = Math.sin(r), o = qs(n, r);
	return {
		lat: o.latitude * p,
		lon: o.longitude * p,
		altKm: o.height,
		ecef: [
			i * n.x + a * n.y,
			-a * n.x + i * n.y,
			n.z
		],
		velKmS: Math.hypot(n.vx, n.vy, n.vz)
	};
}
function lc(e, t, n, r = 20) {
	let i = [];
	if (!(n >= t)) return i;
	let a = Math.max(1, r) * 1e3, o = Math.floor((n - t) / a + 1e-9);
	for (let n = 0; n <= o; n++) {
		let r = t + n * a, o = sc(e, r);
		o && i.push({
			t: r,
			lat: o.lat,
			lon: o.lon,
			altKm: o.altKm
		});
	}
	return i;
}
function uc(e, t, n, r) {
	let i = [];
	for (let a of _s(e)) {
		let e = a.profile;
		if (a.category !== "weather-geo" || !e?.operational || !e.cadenceMin) continue;
		let o = Qs(a.norad), s = o && cc(o, r);
		if (!s) continue;
		let c = tc(x(t, s), s.altKm);
		if (c < 5) continue;
		let l = tc(x(t, {
			lat: 0,
			lon: s.lon
		}), s.altKm) < 10;
		i.push({
			norad: a.norad,
			name: a.displayName,
			operator: e.operator,
			subLon: s.lon,
			elevationDeg: c,
			cadenceMin: e.cadenceMin,
			imagesInWindow: Math.floor((r - n) / (e.cadenceMin * 6e4)),
			frames: e.frames,
			rim: l || void 0
		});
	}
	return i.sort((e, t) => t.elevationDeg - e.elevationDeg);
}
var dc = (e, t) => e[0] * t[0] + e[1] * t[1] + e[2] * t[2], fc = (e) => [
	Math.cos(e.lat * f) * Math.cos(e.lon * f),
	Math.cos(e.lat * f) * Math.sin(e.lon * f),
	Math.sin(e.lat * f)
];
function pc(e) {
	let t = fc(e), n = [
		-Math.sin(e.lon * f),
		Math.cos(e.lon * f),
		0
	], r = [
		t[1] * n[2] - t[2] * n[1],
		t[2] * n[0] - t[0] * n[2],
		t[0] * n[1] - t[1] * n[0]
	];
	return {
		r: 1 + e.altKm / l,
		s: t,
		e: n,
		n: r
	};
}
var mc = (e, t) => Math.asin(Math.max(-1, Math.min(1, t * Math.sin(e)))) - e, hc = .01;
function gc(e, t) {
	let n = Math.asin(1 / (1 + e.altitudeKm / l)), r = e.node === "descending" ? -1 : 1, i = Math.max(hc, Math.min(.99, (t - e.tStart) / Math.max(1, e.tEnd - e.tStart)));
	return r * n * (2 * i - 1);
}
var _c = 72;
function vc(e, t, n, r, i = hs(e)?.profile) {
	let a = i?.scan, o = Qs(e), s = o && cc(o, n);
	if (!a || !s) return;
	let c = pc({
		lat: s.lat,
		lon: s.lon,
		altKm: s.altKm
	}), u = c.r, d = Math.asin(1 / u), p = a.minutes * 6e4, m = a.from === "north" ? -1 : 1, h = fc(t), g = u - dc(h, c.s), _ = dc(h, c.n), v = (m * Math.max(-d, Math.min(d, Math.atan2(_, g))) + d) / (2 * d), y = Math.round(n + v * p), b = [
		g * c.n[0] + _ * c.s[0],
		g * c.n[1] + _ * c.s[1],
		g * c.n[2] + _ * c.s[2]
	], C = dc(b, h);
	for (let e = 0; e < 3; e++) b[e] -= C * h[e];
	let w = Math.hypot(b[0], b[1], b[2]), T = 2 * d / (p / 1e3), E = w > 1e-9 ? T * (g * g + _ * _) / w * l : 400, D = [
		-Math.sin(t.lon * f),
		Math.cos(t.lon * f),
		0
	], O = [
		h[1] * D[2] - h[2] * D[1],
		h[2] * D[0] - h[0] * D[2],
		h[0] * D[1] - h[1] * D[0]
	], k = w > 1e-9 ? (Math.atan2(m * dc(b, D), m * dc(b, O)) / f + 360) % 360 : m < 0 ? 180 : 0, ee = m < 0 ? "descending" : "ascending", te = n + p, A = [];
	for (let e = 0; e <= _c; e++) {
		let t = Math.round(n + (hc + (1 - 2 * hc) * e / _c) * p), r = gc({
			tStart: n,
			tEnd: te,
			altitudeKm: s.altKm,
			node: ee
		}, t);
		A.push({
			t,
			lat: s.lat + mc(r, u) / f,
			lon: s.lon,
			altKm: s.altKm
		});
	}
	let j = x(t, s);
	return {
		id: `geo-${e}-${Math.round(n / 6e4)}`,
		norad: e,
		tClosest: y,
		tStart: n,
		tEnd: te,
		groundDistanceKm: j,
		offNadirDeg: ec(j, s.altKm),
		elevationDeg: tc(j, s.altKm),
		azimuthDeg: S(t, s),
		altitudeKm: s.altKm,
		groundSpeedKmS: Math.min(400, E),
		headingDeg: k,
		node: ee,
		sunElevationDeg: ic(t.lat, t.lon, y),
		inSwath: !0,
		inFieldOfRegard: !0,
		verdict: "imaged",
		track: A,
		captureId: r,
		geostationary: !0
	};
}
// src/engine/clearCover.ts
var yc = 60 * m, bc = 4, xc = 8, Sc = (e) => e.collection === "sentinel-2-l2a" || e.collection === "landsat-c2-l2";
function Cc(e) {
	return e.spot === "cloud" || (e.cloudCoverPct ?? 0) >= 70;
}
function wc(e, t) {
	let n = new Map(t.map((e) => [e.id, e]));
	for (let t of e) {
		if (t.verdict !== "imaged" || !t.captureId) continue;
		let e = n.get(t.captureId);
		if (e && Sc(e) && !Cc(e)) return !1;
	}
	return !0;
}
function Tc(e) {
	return !e.some((e) => Sc(e) && !Cc(e));
}
var Ec = {
	search: yn,
	spot: wo
}, Dc = (e) => e instanceof Error && e.name === "AbortError";
async function Oc(e, t, n, r, i) {
	let a = e.filter((e) => Sc(e) && e.datetime < n && (e.cloudCoverPct ?? 100) < 70).sort((e, t) => t.datetime - e.datetime).slice(0, xc);
	for (let e = 0; e < a.length; e += bc) {
		let n = a.slice(e, e + bc), o = n.map(() => void 0), s = await new Promise((e, a) => {
			let s = n.length, c = () => {
				for (let t = 0; t < n.length; t++) {
					let n = o[t];
					if (n === void 0) return;
					if (n === "clear" || n === "cirrus") return e(t);
				}
				s === 0 && e(-1);
			};
			n.forEach((e, n) => {
				r(e, t, i).catch((e) => {
					if (Dc(e) || i?.aborted) throw e;
					return "unknown";
				}).then((e) => {
					o[n] = e, s--, c();
				}, a);
			});
		});
		if (s >= 0) return {
			...n[s],
			spot: o[s]
		};
	}
}
var kc = /* @__PURE__ */ new An(8);
function Ac(e, t, n, r = Ec) {
	let i = `${e.lat.toFixed(4)},${e.lon.toFixed(4)}|${t}`, a = r === Ec ? kc.get(i) : void 0;
	a || (a = r.search(e, t - yc, t).catch(() => []), r === Ec && (kc.set(i, a), a.then((e) => {
		!e.length && kc.peek(i) === a && kc.delete(i);
	})));
	let o = a, s;
	return {
		pick: () => s ??= o.then((i) => {
			try {
				performance.mark("overflight:engine-cover-listed");
			} catch {}
			return Oc(i, e, t, r.spot, n);
		}),
		get started() {
			return s !== void 0;
		}
	};
}
// src/engine/match.ts
var jc = 6e5, Mc = 36e5;
function Nc(e) {
	return e.norad ?? Io(e.platform) ?? Lo(e.collection);
}
function Pc(e, t) {
	let n = Nc(e);
	if (n === void 0) return;
	let r;
	for (let i of t) {
		if (i.norad !== n) continue;
		let t = i.tClosest - e.datetime;
		t < -6e5 || t > 36e5 || (!r || Math.abs(t) < Math.abs(r.tClosest - e.datetime)) && (r = i);
	}
	return r;
}
function Fc(e, t, n) {
	if (!t) return !0;
	let r = e.cloudCoverPct ?? 101, i = t.cloudCoverPct ?? 101;
	return r === i ? Math.abs(e.datetime - n.tClosest) < Math.abs(t.datetime - n.tClosest) : r < i;
}
function Ic(e, t) {
	let n = /* @__PURE__ */ new Map(), r = [];
	for (let i of t) {
		let t = Pc(i, e);
		t ? Fc(i, n.get(t), t) && n.set(t, i) : r.push(i);
	}
	for (let [e, t] of n) e.verdict = "imaged", e.captureId = t.id;
	return r;
}
function Lc(e, t, n) {
	let r = Nc(t);
	if (r === void 0) return;
	let i = w(t.datetime, n), a;
	for (let o of e) if (o.norad === r && o.verdict !== "imaged") {
		if (Math.abs(o.tClosest - t.datetime) < 6e5) return o;
		w(o.tClosest, n) !== i || o.sunElevationDeg <= 0 || (!a || o.groundDistanceKm < a.groundDistanceKm) && (a = o);
	}
	return a;
}
function Rc(e, t, n) {
	let r = [], i = /* @__PURE__ */ new Set();
	for (let a of t) {
		if (i.has(a.id)) continue;
		i.add(a.id);
		let t = Lc(e, a, n);
		t && (t.verdict = "imaged", t.captureId = a.id, r.push(a));
	}
	return r;
}
// src/engine/categories.ts
var zc = [
	"open-optical",
	"commercial-optical",
	"radar",
	"weather-leo",
	"crewed"
];
function Bc(e) {
	return zc.includes(e);
}
var Vc = 48e4, Hc = 72921159e-12, Uc = 5, Wc = 1800, Gc = 12e5, Kc = .5 * f, qc = 100, Jc = 500, Yc = 15e3, Xc = 27e5;
function Zc(e, t) {
	if (!Bc(e.category) || !(t[Bo.meanMotion] >= 6)) return null;
	let n = e.profile, r = {
		norad: e.norad,
		row: t,
		category: e.category
	};
	switch (e.category) {
		case "crewed": return {
			...r,
			mode: "elevation",
			minElevationDeg: 10
		};
		case "open-optical":
		case "weather-leo": return n?.swathKm ? {
			...r,
			mode: "swath",
			swathKm: n.swathKm
		} : null;
		case "commercial-optical":
		case "radar": return n?.maxOffNadirDeg ? {
			...r,
			mode: "regard",
			maxOffNadirDeg: n.maxOffNadirDeg,
			swathKm: n.swathKm
		} : n?.swathKm ? {
			...r,
			mode: "swath",
			swathKm: n.swathKm
		} : null;
	}
}
function Qc(e, t) {
	switch (e.mode) {
		case "swath": return (e.swathKm ?? 0) / 2;
		case "regard": return nc(e.maxOffNadirDeg ?? 0, t);
		case "elevation": return rc(e.minElevationDeg ?? 10, t);
	}
}
function $c(e) {
	let t = e[Bo.meanMotion] * 2 * Math.PI / 86400, n = Math.min(.99, Math.max(0, e[Bo.ecc])), r = Math.cbrt(d / (t * t));
	return {
		omegaMax: t * (1 + n) ** 2 / (1 - n * n) ** 1.5 * 1.1 + Hc,
		apogeeAltKm: r * (1 + n) - u + 30
	};
}
function el(e, t, n) {
	let r = sc(e, n);
	return r ? x(t, r) : Infinity;
}
function tl(e, t, n, r = qc) {
	let i = (Math.sqrt(5) - 1) / 2, a = n - i * (n - t), o = t + i * (n - t), s = e(a), c = e(o);
	for (; n - t > r;) s <= c ? (n = o, o = a, c = s, a = n - i * (n - t), s = e(a)) : (t = a, a = o, s = c, o = t + i * (n - t), c = e(o));
	let l = (t + n) / 2, u = l, d = e(l);
	for (let r of [t, n]) {
		let t = e(r);
		t < d && (d = t, u = r);
	}
	return u;
}
function nl(e, t, n) {
	for (; Math.abs(n - t) > Jc;) {
		let r = (t + n) / 2;
		e(r) <= 0 ? t = r : n = r;
	}
	return (t + n) / 2;
}
function rl(e, t) {
	let n = t.sunElevationDeg >= 5;
	switch (e) {
		case "open-optical": return t.inSwath && n ? "likely" : null;
		case "weather-leo": return t.inSwath ? "likely" : null;
		case "commercial-optical": return (t.inSwath || t.inFieldOfRegard) && n ? "could" : null;
		case "radar": return t.inSwath || t.inFieldOfRegard ? "could" : null;
		case "crewed": return t.elevationDeg >= 10 ? "overhead" : null;
	}
}
function il(e, t) {
	return `${e}-${Math.round(t / 6e4)}`;
}
function al(e, t, n, r) {
	let i = sc(e, r), a = sc(e, r - 1e3), o = sc(e, r + 1e3);
	if (!i || !a || !o) return null;
	let s = x(n, i), c = Qc(t, i.altKm), l = t.mode === "swath" && s <= c, u = t.mode === "regard" ? s <= c : l;
	return {
		sub: i,
		groundDistanceKm: s,
		offNadirDeg: ec(s, i.altKm),
		elevationDeg: tc(s, i.altKm),
		azimuthDeg: S(n, i),
		headingDeg: S(a, o),
		groundSpeedKmS: x(a, o) / 2,
		node: o.lat >= a.lat ? "ascending" : "descending",
		sunElevationDeg: ic(n.lat, n.lon, r),
		inSwath: l,
		inFieldOfRegard: u,
		fieldKm: c
	};
}
function ol(e, t, n, r) {
	let i = (n) => el(e, t, n) - r;
	if (i(n) > 0) return [n, n];
	let a = (e) => {
		let t = n;
		for (let r = Yc; r <= Xc; r += Yc) {
			let a = n + e * r;
			if (i(a) > 0) return nl(i, t, a);
			t = a;
		}
		return t;
	};
	return [a(-1), a(1)];
}
function sl(e, t, n, r, i, a) {
	let [o, s] = ol(e, n, r, i.fieldKm).map(Math.round);
	return {
		id: il(t.norad, r),
		norad: t.norad,
		tClosest: r,
		tStart: o,
		tEnd: s,
		groundDistanceKm: i.groundDistanceKm,
		offNadirDeg: i.offNadirDeg,
		elevationDeg: i.elevationDeg,
		azimuthDeg: i.azimuthDeg,
		altitudeKm: i.sub.altKm,
		groundSpeedKmS: i.groundSpeedKmS,
		headingDeg: i.headingDeg,
		node: i.node,
		sunElevationDeg: i.sunElevationDeg,
		inSwath: i.inSwath,
		inFieldOfRegard: i.inFieldOfRegard,
		verdict: a,
		track: lc(e, r - Vc, r + Vc, 20)
	};
}
function cl(e, t, n) {
	let { omegaMax: r, apogeeAltKm: i } = $c(t.row), a = Qc(t, i) / l + Kc, o = n.place.lat * f, s = n.place.lon * f, c = Math.cos(o) * Math.cos(s), u = Math.cos(o) * Math.sin(s), d = Math.sin(o), p = (t) => {
		let n = Us(e, ac(e, t));
		if (!n) return NaN;
		let { x: r, y: i, z: a } = n.position, o = g(t), s = Math.cos(o), l = Math.sin(o), f = (r * (s * c - l * u) + i * (l * c + s * u) + a * d) / Math.sqrt(r * r + i * i + a * a);
		return Math.acos(f > 1 ? 1 : f < -1 ? -1 : f);
	}, m = n.t0 - Gc, h = n.t1 + Gc, _ = [], v = NaN, y = NaN, b = NaN, x = NaN, S = 0, C = m;
	for (;;) {
		let e = p(C);
		if (!Number.isFinite(e)) {
			if (++S > 50 || (Number.isNaN(v) || _.push([v, y]), v = NaN, b = NaN, C >= h)) break;
			C = Math.min(h, C + 6e5);
			continue;
		}
		if (Number.isNaN(b) || ((x + e - r * ((C - b) / 1e3)) / 2 <= a || e <= a || x <= a ? (Number.isNaN(v) && (v = b), y = C) : Number.isNaN(v) || (_.push([v, y]), v = NaN)), b = C, x = e, C >= h) break;
		let t = Math.min(Wc, Math.max(Uc, Math.abs(e - a) / r));
		C = Math.min(h, C + t * 1e3);
	}
	return Number.isNaN(v) || _.push([v, y]), _;
}
function ll(e, t, n) {
	let { place: r, t0: i, t1: a } = n, o = [], s = (t) => el(e, r, t);
	for (let [c, l] of cl(e, t, n)) {
		let n = Math.round(tl(s, c, l));
		if (n < i || n > a || o.length && Math.abs(o[o.length - 1].tClosest - n) < 6e4) continue;
		let u = al(e, t, r, n);
		!u || u.groundDistanceKm > u.fieldKm || o.push({
			tClosest: n,
			geometry: u
		});
	}
	return o;
}
function ul(e, t, n) {
	let r = [];
	for (let { tClosest: i, geometry: a } of ll(e, t, n)) {
		let o = rl(t.category, a);
		o && r.push(sl(e, t, n.place, i, a, o));
	}
	return r;
}
function dl(e, t, n, r, i, a) {
	let o = (t) => el(e, n, t), s = 3e4, c = NaN, l = Infinity;
	for (let e = r; e <= i; e += s) {
		let t = o(e);
		t < l && (l = t, c = e);
	}
	if (!Number.isFinite(l)) return null;
	let u = Math.round(tl(o, c - s, c + s)), d = al(e, t, n, u);
	return d ? sl(e, t, n, u, d, a) : null;
}
function fl(e, t, n) {
	let r = [], i = 0;
	for (let a of e) {
		try {
			let e = Ys(a.row);
			if (e) for (let n of ul(e, a, t)) r.push(n);
		} catch (e) {
			console.warn(`Pass search skipped NORAD ${a.norad}:`, e);
		}
		n?.(++i);
	}
	return r;
}
// src/engine/passes.worker.ts?worker&url
var pl = new URL("assets/passes.worker-B35WCE6a.js", import.meta.url).href;
function ml(e, t, n, r) {
	let i = Array(n);
	for (let a = 0; a < n; a++) {
		let n = (t + a) * 4;
		i[a] = {
			t: Math.round(r + e[n] * 1e3),
			lat: e[n + 1],
			lon: e[n + 2],
			altKm: e[n + 3]
		};
	}
	return i;
}
function hl(e, t) {
	let { points: n, spans: r } = t;
	return e.map((e, t) => {
		let i = r[t * 2], a = r[t * 2 + 1], o;
		return Object.defineProperty(e, "track", {
			enumerable: !0,
			configurable: !0,
			get: () => o ??= ml(n, i, a, e.tClosest),
			set(e) {
				Object.defineProperty(this, "track", {
					value: e,
					writable: !0,
					enumerable: !0,
					configurable: !0
				});
			}
		});
	});
}
function gl(e) {
	let t = Object.getOwnPropertyDescriptor(e, "track");
	if (!t?.get) return { ...e };
	let n = {};
	for (let t in e) t !== "track" && (n[t] = e[t]);
	return Object.defineProperty(n, "track", t);
}
// src/engine/pool.ts
var _l = 12, vl = 1;
function yl() {
	return typeof DOMException < "u" ? new DOMException("Aborted", "AbortError") : Object.assign(/* @__PURE__ */ Error("Aborted"), { name: "AbortError" });
}
function bl() {
	return typeof matchMedia == "function" && matchMedia("(pointer: coarse) and (hover: none)").matches;
}
function xl() {
	let e = typeof navigator < "u" && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4;
	return Math.min(bl() ? 2 : 4, Math.max(1, e - 1));
}
function Sl() {
	let e = {
		url: pl,
		shared: !1
	};
	return typeof fetch != "function" || typeof URL.createObjectURL != "function" ? Promise.resolve(e) : fetch(pl).then((e) => {
		if (!e.ok) throw Error(`HTTP ${e.status}`);
		return e.blob();
	}).then((e) => ({
		url: URL.createObjectURL(new Blob([e], { type: "text/javascript" })),
		shared: !0
	})).catch(() => e);
}
var Cl = class {
	size;
	slots = [];
	queue = [];
	mainThreadBusy = !1;
	chunks = /* @__PURE__ */ new Map();
	starting = !1;
	constructor(e) {
		this.size = e, typeof Worker < "u" && (this.starting = !0, Sl().then((e) => this.spawn(e)));
	}
	spawn(e) {
		for (let t = 0; t < this.size; t++) try {
			let n = new Worker(e.url, {
				type: "module",
				name: `passes-${t}`
			}), r = {
				worker: n,
				dead: !1,
				script: e
			};
			n.onmessage = (e) => this.onMessage(r, e.data), n.onerror = (e) => {
				e.preventDefault?.(), this.onWorkerFailure(r);
			}, n.onmessageerror = () => this.onWorkerFailure(r), this.slots.push(r);
		} catch {
			break;
		}
		this.starting = !1, this.pump();
	}
	get workerCount() {
		return this.slots.filter((e) => !e.dead).length;
	}
	run(e, t, n = {}) {
		let { signal: r, onProgress: i } = n, a = Math.max(1, Math.floor(n.chunkSize ?? _l));
		return new Promise((n, o) => {
			if (r?.aborted) return o(yl());
			if (!e.length) return n([]);
			let s = () => {
				l.settled || (l.settled = !0, this.dropSettled(), o(yl()));
			}, c = () => r?.removeEventListener("abort", s), l = {
				query: t,
				total: e.length,
				progress: /* @__PURE__ */ new Map(),
				pendingChunks: 0,
				passes: [],
				settled: !1,
				onProgress: i,
				resolve: (e) => (c(), n(e)),
				reject: (e) => (c(), o(e))
			};
			for (let t = 0; t < e.length; t += a) {
				let n = {
					id: vl++,
					job: l,
					targets: e.slice(t, t + a)
				};
				l.pendingChunks++, this.chunks.set(n.id, n), this.queue.push(n);
			}
			r?.addEventListener("abort", s, { once: !0 }), this.pump();
		});
	}
	dropSettled() {
		let e = [];
		for (let t of this.queue) t.job.settled ? this.chunks.delete(t.id) : e.push(t);
		this.queue = e;
	}
	pump() {
		this.dropSettled();
		for (let e of this.slots) {
			if (e.dead || e.chunk) continue;
			let t = this.queue.shift();
			if (!t) return;
			e.chunk = t;
			let n = {
				type: "run",
				chunkId: t.id,
				targets: t.targets,
				query: t.job.query
			};
			e.worker.postMessage(n);
		}
		this.queue.length && this.workerCount === 0 && !this.starting && this.drainOnMainThread();
	}
	onMessage(e, t) {
		if (e.alive = !0, t.type === "ready") return;
		let n = this.chunks.get(t.chunkId);
		n && (t.type === "progress" ? this.report(n, t.done) : (e.chunk = void 0, t.type === "result" ? this.complete(n, hl(t.passes, t.tracks)) : this.runHere(n), this.pump()));
	}
	onWorkerFailure(e) {
		if (!e.dead) {
			e.dead = !0;
			try {
				e.worker.terminate();
			} catch {}
			e.chunk &&= (this.queue.unshift(e.chunk), void 0), this.slots.every((e) => e.dead && e.script.shared && !e.alive) && this.slots.length === this.size ? (this.slots = [], this.spawn({
				url: pl,
				shared: !1
			})) : this.pump();
		}
	}
	runHere(e) {
		if (e.job.settled) this.chunks.delete(e.id);
		else try {
			this.complete(e, fl(e.targets, e.job.query, (t) => this.report(e, t)));
		} catch (t) {
			this.fail(e, t);
		}
	}
	async drainOnMainThread() {
		if (!this.mainThreadBusy) {
			this.mainThreadBusy = !0;
			try {
				for (; this.queue.length;) this.runHere(this.queue.shift()), await new Promise((e) => setTimeout(e, 0));
			} finally {
				this.mainThreadBusy = !1;
			}
		}
	}
	report(e, t) {
		let n = e.job;
		if (n.settled) return;
		n.progress.set(e.id, t);
		let r = 0;
		for (let e of n.progress.values()) r += e;
		try {
			n.onProgress?.(Math.min(r, n.total), n.total);
		} catch (e) {
			console.error("Pass search progress callback threw:", e);
		}
	}
	complete(e, t) {
		this.chunks.delete(e.id);
		let n = e.job;
		if (!n.settled) {
			for (let e of t) n.passes.push(e);
			this.report(e, e.targets.length), --n.pendingChunks === 0 && (n.settled = !0, n.resolve(n.passes));
		}
	}
	fail(e, t) {
		this.chunks.delete(e.id);
		let n = e.job;
		n.settled || (n.settled = !0, n.reject(t));
	}
}, wl;
function Tl() {
	wl ??= new Cl(xl());
}
function El(e, t, n = {}) {
	return Tl(), wl.run(e, t, n);
}
function Dl() {
	return wl?.workerCount ?? 0;
}
// src/engine/weather.ts
var Ol = 2e4, kl = 864e5;
function Al(e, t) {
	let n = /* @__PURE__ */ new Map();
	for (let r of e) {
		if (hs(r.norad)?.profile?.gibs?.kind !== "daily") continue;
		let e = `${r.norad}@${w(r.tClosest, t)}`, i = n.get(e);
		i ? i.push(r) : n.set(e, [r]);
	}
	return [...n.values()];
}
function jl(e) {
	return hs(e)?.profile?.gibs?.collection.startsWith("gibs-viirs-") ?? !1;
}
function Ml(e, t, n = {}) {
	let r = new AbortController(), i = () => r.abort();
	n.signal?.addEventListener("abort", i, { once: !0 });
	let a = [], o = [], s = /* @__PURE__ */ new Map(), c = /* @__PURE__ */ new Set(), l = /* @__PURE__ */ new Set(), u = 0, d = 0, f = 0, p = !1, m = !1, h = 0, g = 0, _, v = () => void 0, y = new Promise((e) => v = e), b = t.then(async (t) => {
		if (p || r.signal.aborted) return;
		let i = Al(t, e.lon);
		u = i.length, u && (h = performance.now(), await Promise.all(i.map((t, i) => (s.set(i, t), za(e, t, r.signal).then((e) => {
			if (!p) {
				a.push(...e);
				return;
			}
			let t = l.delete(i);
			for (let t of e) n.onLate?.(t, c.has(t.id));
			t && n.onLateSettled?.(l.size);
		}, () => {
			p ? l.delete(i) && n.onLateSettled?.(l.size) : f++;
		}).finally(() => {
			s.delete(i), p || (d++, n.onSettle?.(d, u));
		})))));
	}).catch(() => void 0).finally(() => {
		m = !0, g ||= performance.now(), clearTimeout(_), n.signal?.removeEventListener("abort", i);
	});
	return {
		settled: Promise.race([b, y]),
		verified: () => [...a].sort((e, t) => t.datetime - e.datetime),
		byRule: () => [...o].sort((e, t) => t.datetime - e.datetime),
		isDone: () => m,
		progress: () => ({
			total: u,
			settled: d,
			failed: f
		}),
		stop: () => {
			if (p) return 0;
			p = !0;
			let t = m ? 0 : s.size;
			if (!m) {
				g = performance.now();
				let t = Date.now();
				for (let [n, r] of s) {
					let i = !1;
					if (r.length && jl(r[0].norad)) for (let n of La(e, r)) {
						if (t - n.datetime < kl) continue;
						let r = w(n.datetime, e.lon);
						a.some((t) => t.norad === n.norad && w(t.datetime, e.lon) > r) && (o.push(n), c.add(n.id), i = !0);
					}
					i || l.add(n);
				}
				let i = n.lateMs ?? Ol;
				i > 0 ? _ = setTimeout(() => r.abort(), i) : r.abort();
			}
			return v(), t;
		},
		timing: () => ({
			startedAt: h,
			finishedAt: g
		}),
		lateLeft: () => l.size
	};
}
// src/engine/report.ts
var Nl = (e) => e.collection === "sentinel-2-l2a" || e.collection === "landsat-c2-l2";
function Pl(e, t, n, r) {
	let i = e.filter(Nl).sort((e, t) => (e.cloudCoverPct ?? 101) - (t.cloudCoverPct ?? 101) || t.datetime - e.datetime).slice(0, Rl);
	if (!i.length) return Promise.resolve();
	let a = !0;
	return Ql(Promise.all(i.map((e) => Promise.resolve().then(() => Co(e, t, r)).then(({ spot: t, clearFraction: n }) => {
		a && (t && t !== "unknown" && (e.spot = t), n !== void 0 && (e.clearFraction = n));
	}, () => void 0))), n, r).catch(() => void 0).finally(() => {
		a = !1;
	});
}
var Fl = 1200, Il = 2e4, Ll = 3 * m, Rl = 4, zl = 1500, Bl = 2e3, Vl = 2500, Hl = {
	halfSizeKm: 400,
	px: 176
}, Ul = 108e5, Wl = "This spot is outside Sentinel-2's acquisition plan (open ocean).", Gl = /* @__PURE__ */ new Intl.NumberFormat("en-US"), Kl = (e, t, n = `${t}S`) => `${Gl.format(e)} ${e === 1 ? t : n}`, ql = () => void 0;
function Jl() {
	return new DOMException("Aborted", "AbortError");
}
function Yl(e) {
	if (e?.aborted) throw Jl();
}
var Xl = (e) => e instanceof Error && e.name === "AbortError";
async function Zl(e, t, n) {
	let r = new AbortController(), i = () => r.abort();
	n?.addEventListener("abort", i, { once: !0 });
	let a, o = new Promise((e, n) => {
		a = setTimeout(() => {
			r.abort(), n(Object.assign(/* @__PURE__ */ Error(`Timed out after ${t} ms`), { name: "TimeoutError" }));
		}, t);
	});
	try {
		return await Promise.race([e(r.signal), o]);
	} finally {
		clearTimeout(a), n?.removeEventListener("abort", i);
	}
}
function Ql(e, t, n) {
	return n?.aborted ? Promise.reject(Jl()) : new Promise((r, i) => {
		let a = () => {
			clearTimeout(s), n?.removeEventListener("abort", o), r();
		}, o = () => {
			clearTimeout(s), i(Jl());
		}, s = setTimeout(a, Math.max(0, t));
		n?.addEventListener("abort", o, { once: !0 }), e.then(a, a);
	});
}
function $l(e) {
	try {
		performance.mark(`overflight:engine-${e}`);
	} catch {}
}
function eu(e, t) {
	if (e) try {
		e(t);
	} catch (e) {
		console.error("computeReport callback threw:", e);
	}
}
function tu(e) {
	let t = [];
	for (let n of _s(e)) {
		let e = gs(n.norad), r = e && Zc(n, e);
		r && t.push(r);
	}
	return t;
}
var nu = 300, ru = 650, iu = (e) => e.collection === "sentinel-1-rtc";
function au(e, t, n, r) {
	let i = [], a = new Map(r.map((e) => [e.id, e]));
	for (let r of n) {
		let n = Nc(r), o = n === void 0 ? void 0 : e.byNorad.get(n), s = o && gs(o.norad), c = o && s && Zc(o, s), l = c && Qs(c.norad);
		if (!c || !l) continue;
		let u = r.datetime - jc, d = r.datetime + Mc, f = dl(l, c, t, u, d, "imaged"), p = iu(r) ? ru : nu;
		if (!f || f.tClosest - u < 6e4 || d - f.tClosest < 6e4 || f.groundDistanceKm > p) continue;
		let m = a.get(f.id);
		m ? m.verdict !== "imaged" && Object.assign(m, {
			verdict: "imaged",
			captureId: r.id
		}) : (f.captureId = r.id, a.set(f.id, f), i.push(f));
	}
	return i;
}
async function ou(e, t = {}) {
	let { signal: n } = t, r = performance.now(), i = t.budgetMs ?? 2500, a = t.days ?? 7, o = t.now ?? Date.now(), s = o - a * m, c = {
		lat: e.lat,
		lon: e.lon
	}, l = [], u = (e, n, r) => eu(t.onProgress, {
		stage: e,
		message: n,
		fraction: r
	});
	Yl(n), u("catalog", "LOADING ORBITAL CATALOG", .02);
	let d = performance.now(), f = 0, p = !1, h = !1, g = t.onArchive ? (e) => !n?.aborted && eu(t.onArchive, e) : void 0, _ = Zl((e) => hn(c, s, o, e, g), Il, n).then((e) => (l.push(...e.degraded), e.captures)).catch((e) => {
		if (Xl(e) && n?.aborted) throw e;
		return h = !0, l.push(e instanceof Error && e.name === "TimeoutError" ? "The Sentinel-2 and Landsat archives were too slow to answer; passes are shown from orbital geometry only." : "The Sentinel-2 and Landsat archives could not be reached; passes are shown from orbital geometry only."), [];
	}).finally(() => {
		f = performance.now() - d, p = !0, $l("archive");
	});
	_.catch(ql);
	let v;
	Zl((e) => gn(c, s, o, e), Il, n).then((e) => {
		v = e, $l("radar");
	}, () => v = []), t.onArchive && _.then((e) => {
		e.length && !n?.aborted && eu(t.onArchive, [...e]);
	}, ql);
	let y = _.then((e) => Pl(e, c, zl, n), ql), b;
	_.then((e) => {
		h || e.some((e) => e.collection === "sentinel-2-l2a") || (b = Promise.resolve().then(() => xn(c, o, n)).catch(() => void 0));
	}, ql);
	let x = Ac(c, s, n), S, C = {
		done: !1,
		found: void 0,
		told: !1
	}, w = () => {
		let e = x.pick();
		return C.done || e.then((e) => {
			$l(e ? "cover-found" : "cover-none"), C.found = e, C.done = !0, e && !C.told && !n?.aborted && (C.told = !0, eu(t.onCover, e));
		}, () => C.done = !0), e;
	};
	_.then(async (e) => {
		h || n?.aborted || !Tc(e) && (await y, !Tc(e) || n?.aborted) || ($l("cover-start"), await w());
	}).catch(ql);
	let T = Promise.resolve().then(() => Oo()).catch(ql);
	Tl();
	let E = await ps(void 0, n);
	Yl(n);
	let D = performance.now() - r, O = tu(E);
	u("catalog", `CATALOG · ${Kl(E.count, "OBJECT")}`, .06);
	let k = o - Date.parse(E.fetchedAt);
	k > Ll ? l.push(`Orbital elements are ${Math.round(k / m)} days old, so pass times may be off by a few minutes.`) : -k > Ll && l.push("These passes are reconstructed from newer orbital elements, so their times may be off by a few minutes.");
	let ee = performance.now(), te = {
		place: c,
		t0: s,
		t1: o
	}, A = (e) => hs(e.norad)?.profile?.gibs?.kind === "daily", j = {
		gibs: 0,
		other: 0
	}, M = () => {
		let e = j.gibs + j.other;
		u("propagate", `PROPAGATING ORBITS · ${Gl.format(e)} / ${Gl.format(O.length)}`, .06 + .64 * (e / Math.max(1, O.length)));
	};
	u("propagate", `PROPAGATING ${Kl(O.length, "ORBIT")} · ${a} DAYS`, .06);
	let N = El(O.filter(A), te, {
		signal: n,
		chunkSize: 1,
		onProgress: (e) => (j.gibs = e, M())
	}), ne = El(O.filter((e) => !A(e)), te, {
		signal: n,
		onProgress: (e) => (j.other = e, M())
	}), re = !1, P, F, I = Ml(c, N, {
		signal: n,
		onSettle: (e, t) => {
			re && u("match", `VERIFYING NASA WEATHER MOSAICS · ${Gl.format(e)} / ${Gl.format(t)}`, .86 + e / t * .13);
		},
		onLate: (e, t) => P?.(e, t),
		onLateSettled: (e) => F?.(e),
		lateMs: t.onUpdate ? void 0 : 0
	}), L = new Promise((e, t) => setTimeout(() => {
		try {
			e(uc(E, c, s, o));
		} catch (e) {
			t(e);
		}
	}, 0));
	L.catch(ql);
	let R = [], ie, z = t.geoItem;
	if (z) {
		let e = lo(z.collection, z.itemId, c, z.norad), t = e && vc(z.norad, c, e.datetime, e.id);
		e && t && R.push({
			pass: t,
			capture: e
		});
	}
	Math.abs(Date.now() - o) < Ul && L.then((e) => {
		for (let t of e) {
			let e = t.frames;
			!e || t.rim || R.some((e) => e.pass.norad === t.norad) || uo(e, c, Hl, { signal: n }).then((r) => {
				if (!r || n?.aborted) return;
				let i = co(e, r, c, t.norad), a = i && vc(t.norad, c, r.time, i.id);
				i && a && (R.push({
					pass: a,
					capture: i
				}), ie?.());
			}).catch(ql);
		}
	}, ql);
	let B;
	try {
		B = (await Promise.all([N, ne])).flat();
	} catch (e) {
		throw I.stop(), e;
	}
	let V = performance.now() - ee;
	$l("passes"), Yl(n);
	let H = await L;
	$l("geo");
	let ae = O.length + _s(E).filter((e) => e.category === "weather-geo" && e.profile?.operational).length, oe = [], U, W, G = (n, i, a, c) => {
		let u = {
			satellitesConsidered: ae,
			passes: n.length,
			imaged: 0,
			likely: 0,
			could: 0,
			overhead: 0
		};
		for (let e of n) u[e.verdict]++;
		let d = [...n, ...R.map((e) => e.pass)].sort((e, t) => e.tClosest - t.tClosest);
		R.length && (i = [...i, ...R.map((e) => e.capture)]);
		let { startedAt: p, finishedAt: m } = I.timing();
		return {
			place: e,
			windowStart: s,
			windowEnd: o,
			generatedAt: Date.now(),
			catalogFetchedAt: E.fetchedAt,
			passes: d,
			captures: i,
			geo: H.map((e) => ({ ...e })),
			counts: u,
			notes: [...l, ...oe],
			partial: a,
			archiveFailed: h,
			coverPending: !!U && !C.done,
			...!a && t.onUpdate && I.lateLeft() > 0 ? { lateChecks: I.lateLeft() } : {},
			...a && W !== void 0 ? { finalDueAt: W } : {},
			...S ? { clearCover: S } : {},
			timings: {
				catalogMs: D,
				passesMs: V,
				archiveMs: f,
				weatherMs: p ? (m || performance.now()) - p : 0,
				firstResultMs: c,
				totalMs: performance.now() - r,
				workers: Dl()
			}
		};
	};
	p || u("archive", "SEARCHING SENTINEL-2 + LANDSAT ARCHIVES", .72);
	let K;
	try {
		K = await _;
	} catch (e) {
		throw I.stop(), e;
	}
	Yl(n), u("match", `MATCHING ${Kl(K.length, "SCENE")} TO ${Kl(B.length, "PASS", "PASSES")}`, .8), $l("archive-in");
	let q = Ic(B, K);
	B.push(...au(E, c, q, B));
	let J = [], se = !1, Y = () => {
		if (se || v === void 0 || n?.aborted) return;
		se = !0;
		let e = Ic(B, v);
		B.push(...au(E, c, e, B));
		let t = new Set(B.map((e) => e.captureId));
		J = v.filter((e) => t.has(e.id));
	};
	Y();
	let ce = () => [...K, ...J];
	$l("matched"), await Promise.all([y, T]), Yl(n);
	let le = b ? await su(b, Bl, n) : void 0;
	if (Yl(n), le === !1) {
		let e = 0;
		for (let t of B) t.verdict === "likely" && hs(t.norad)?.category === "open-optical" && (t.verdict = "overhead", e++);
		e && l.push(Wl);
	}
	let X, Z, ue = !1;
	!h && wc(B, K) && (U = w().then((e) => (S = e, e && X && !ue && !n?.aborted && eu(t.onPartial, G(X, Z ?? ce(), !0, de)), e), () => void 0), C.done && (S = C.found));
	let de = 0;
	if (!I.isDone() && t.onPartial) {
		de = performance.now() - r, W = Math.max(r + i, (I.timing().startedAt || performance.now()) + Fl), $l("partial"), Y(), X = B.map(gl), Z = ce(), ue = !!S;
		let e = G(X, Z, !0, de);
		$l("partial-built"), eu(t.onPartial, e), $l("partial-sent");
	}
	if (!I.isDone()) {
		re = !0;
		let { total: e, settled: t } = I.progress();
		u("match", e ? `VERIFYING NASA WEATHER MOSAICS · ${Gl.format(t)} / ${Gl.format(e)}` : "VERIFYING NASA WEATHER MOSAICS", .86 + .13 * (e ? t / e : 0));
		let a = I.timing().startedAt || performance.now(), o = W ?? Math.max(r + i, a + Fl);
		try {
			await Ql(I.settled, o - performance.now(), n);
		} catch (e) {
			throw I.stop(), e;
		}
	}
	let fe = I.stop(), pe = I.byRule(), { total: me, failed: he } = I.progress(), Q = fe - pe.length + he, $ = pe.length, ge = () => {
		let e = [];
		if ($ > 0 && e.push(`NASA GIBS was slow to confirm ${$ === 1 ? "one VIIRS image" : `${Gl.format($)} VIIRS images`}; VIIRS images the whole globe every day, so ${$ === 1 ? "that pass counts" : "those passes count"} as watched.`), Q > 0) {
			let t = Q >= me;
			e.push(fe > 0 ? t ? "NASA GIBS did not answer in time, so weather-satellite images are not shown." : `NASA GIBS did not return ${Gl.format(Q)} of ${Gl.format(me)} weather-satellite images in time; those passes are shown as likely.` : t ? "NASA GIBS could not be reached, so weather-satellite images are not shown." : `NASA GIBS failed to return ${Gl.format(Q)} of ${Gl.format(me)} weather-satellite images; those passes are shown as likely.`);
		}
		return e;
	};
	oe = ge();
	let _e = Rc(B, [...I.verified(), ...pe], e.lon), ve = de || performance.now() - r;
	U && !S && !t.onUpdate && await Ql(U, Vl, n), Yl(n), X = void 0, Y();
	let ye = ce(), be = G(B, [...ye, ..._e], !1, ve);
	if ($l("final"), u("done", `${Kl(be.counts.passes, "PASS", "PASSES")} · ${Kl(be.counts.imaged, "IMAGE")}`, 1), t.onUpdate) {
		let r = B, i = [..._e];
		U && be.coverPending && U.then(() => {
			n?.aborted || (be = G(r, [...ye, ...i], !1, ve), eu(t.onUpdate, be));
		}), P = (a, o) => {
			if (n?.aborted) return;
			if (o) {
				$ = Math.max(0, $ - 1), oe = ge(), be = G(r, [...ye, ...i], !1, ve), eu(t.onUpdate, be);
				return;
			}
			let s = Lc(r, a, e.lon);
			if (!s) return;
			let c = Object.assign(gl(s), {
				verdict: "imaged",
				captureId: a.id
			});
			r = r.map((e) => e === s ? c : e), i.push(a), Q = Math.max(0, Q - 1), oe = ge(), be = G(r, [...ye, ...i], !1, ve), eu(t.onUpdate, be);
		}, ie = () => {
			n?.aborted || (be = G(r, [...ye, ...i], !1, ve), eu(t.onUpdate, be));
		}, F = (e) => {
			n?.aborted || e > 0 || !be.lateChecks || (be = G(r, [...ye, ...i], !1, ve), eu(t.onUpdate, be));
		};
	}
	return be;
}
async function su(e, t, n) {
	let r;
	return await Ql(e.then((e) => {
		r = e;
	}), t, n), r;
}
export { ou as computeReport, hs as getSatInfo };
