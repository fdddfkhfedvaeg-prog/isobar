import { describe, expect, it } from 'vitest'
import { KEYFRAMES, samplePose } from './timeline'

describe('samplePose', () => {
  it('hits keyframes exactly', () => {
    for (const k of KEYFRAMES) samplePose(k.t).cam.forEach((v, i) => expect(v).toBeCloseTo(k.cam[i], 9))
  })
  it('clamps outside 0–1', () => {
    expect(samplePose(-1)).toEqual(samplePose(0))
    expect(samplePose(2)).toEqual(samplePose(1))
  })
  it('is fully exploded during the hold', () => {
    expect(samplePose(0.68).explode).toBe(1)
  })
  it('keyframes are ordered', () => {
    for (let i = 1; i < KEYFRAMES.length; i++) expect(KEYFRAMES[i].t).toBeGreaterThan(KEYFRAMES[i - 1].t)
  })
})
