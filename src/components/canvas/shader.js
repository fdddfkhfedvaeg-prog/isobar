export const VERTEX = /* glsl */ `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

export const FRAGMENT = /* glsl */ `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPointer;
uniform vec3 uTop;
uniform vec3 uBottom;
uniform vec3 uCloudCol;
uniform float uSun;
uniform float uStars;
uniform float uCloud;
uniform float uFog;
uniform float uRain;
uniform float uSnow;
uniform float uFlash;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 par = uPointer * 0.015;

  // Sky gradient with a soft horizon lift.
  vec3 col = mix(uBottom, uTop, smoothstep(0.0, 1.0, pow(uv.y, 0.85)));

  // Sun: layered glow + slowly rotating volumetric rays.
  if (uSun > 0.001) {
    vec2 sunPos = vec2(aspect * 0.8, 0.9) + par * 2.0;
    vec2 d = p - sunPos;
    float r = length(d);
    float ang = atan(d.y, d.x);
    float glow = exp(-r * 3.2) * 0.5 + exp(-r * 16.0) * 0.55 + smoothstep(0.05, 0.0, r) * 0.6;
    float rays = 0.5 + 0.5 * sin(ang * 7.0 + uTime * 0.04);
    rays *= 0.6 + 0.4 * sin(ang * 19.0 - uTime * 0.07);
    rays = pow(rays, 2.5) * exp(-r * 1.4) * 0.28;
    col += vec3(1.0, 0.88, 0.66) * (glow + rays) * uSun;
  }

  // Twinkling starfield (two layers for depth).
  if (uStars > 0.001) {
    float stars = 0.0;
    for (int l = 0; l < 2; l++) {
      float fl = float(l);
      vec2 g = (p + par * (0.4 + fl)) * (70.0 + fl * 55.0);
      vec2 id = floor(g);
      float h = hash(id + fl * 17.0);
      vec2 o = vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5;
      float dist = length(fract(g) - 0.5 - o * 0.6);
      float s = step(0.975, h) * smoothstep(0.11 - fl * 0.03, 0.0, dist);
      float tw = 0.55 + 0.45 * sin(uTime * (0.8 + h * 2.5) + h * 40.0);
      stars += s * tw * (1.0 - fl * 0.35);
    }
    col += vec3(0.86, 0.9, 1.0) * stars * uStars * smoothstep(0.08, 0.55, uv.y);
  }

  // Drifting cloud decks.
  if (uCloud > 0.001) {
    float t = uTime * 0.012;
    vec2 cp = p + par;
    float c1 = fbm(cp * vec2(1.3, 2.2) + vec2(t, 0.0));
    float c2 = fbm(cp * vec2(2.8, 4.0) - vec2(t * 1.6, t * 0.2) + c1 * 1.2);
    float cloud = smoothstep(0.38, 0.82, c1 * 0.55 + c2 * 0.55);
    float shade = 0.75 + 0.25 * smoothstep(0.3, 0.8, c2);
    col = mix(col, uCloudCol * shade, cloud * uCloud * (0.3 + 0.6 * uv.y));
  }

  // Low volumetric fog banks.
  if (uFog > 0.001) {
    float warp = fbm(p * 1.7 + vec2(uTime * 0.01, 0.0));
    float f = fbm(vec2(p.x * 1.1 - uTime * 0.018, p.y * 3.2) + warp);
    float band = smoothstep(0.95, 0.05, uv.y);
    col = mix(col, uCloudCol * 0.92, clamp(f * band * uFog * 1.25, 0.0, 0.8));
  }

  // Slanted rain streaks in three parallax layers.
  if (uRain > 0.001) {
    float rain = 0.0;
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float cols = 60.0 + fi * 45.0;
      float x = (p.x + p.y * 0.16) * cols;
      float id = floor(x);
      float h = hash(vec2(id, fi * 13.1));
      float fx = fract(x) - 0.5;
      float y = p.y * (1.6 + fi * 0.9) + uTime * (1.3 + h * 0.7 + fi * 0.35) + h * 17.0;
      float seg = fract(y);
      float on = step(0.5, hash(vec2(id, floor(y) + fi * 7.0)));
      float drop = smoothstep(0.22, 0.0, seg) * smoothstep(0.0, 0.01, seg) * on;
      float w = smoothstep(0.09, 0.0, abs(fx));
      rain += drop * w * (0.32 - fi * 0.07);
    }
    col += vec3(0.72, 0.8, 0.94) * rain * uRain;
  }

  // Snowflakes: soft discs swaying as they fall.
  if (uSnow > 0.001) {
    float snow = 0.0;
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float scale = 5.0 + fi * 4.0;
      vec2 q = p * scale;
      q.y += uTime * (0.22 + fi * 0.09);
      q.x += sin(uTime * 0.4 + q.y * 1.1 + fi) * 0.35;
      vec2 id = floor(q);
      vec2 o = (vec2(hash(id), hash(id + 1.3)) - 0.5) * 0.6;
      float d = length(fract(q) - 0.5 - o);
      snow += smoothstep(0.07 - fi * 0.015, 0.0, d) * step(0.45, hash(id + 9.0)) * (1.0 - fi * 0.25);
    }
    col += vec3(0.95, 0.97, 1.0) * snow * uSnow * 0.85;
  }

  // Lightning flash + subtle vignette + film grain (also kills banding).
  col += vec3(0.75, 0.8, 1.0) * uFlash * (0.4 + 0.6 * uv.y);
  vec2 v = uv - 0.5;
  col *= 1.0 - dot(v, v) * 0.55;
  col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) * 0.018;

  gl_FragColor = vec4(col, 1.0);
}
`
