// Simulation for "Function generator using operational amplifier"
// (Integrated Circuit Lab, Experiment 7).
//
// Circuit modelled: a two op-amp square/triangle-wave (relaxation)
// generator followed by a sine-shaping stage, matching the schematic
// already drawn on the frontend (comparator -> integrator -> shaper):
//
//   OP-AMP 1  comparator (Schmitt trigger), feedback resistor Rf,
//             threshold-setting resistor R1 -> outputs a square wave
//             swinging between +Vsat and -Vsat.
//   OP-AMP 2  integrator, resistor R2 and capacitor C -> integrates the
//             square wave into a triangular wave.
//   OP-AMP 3  sine-shaping network -> converts the triangle into a sine
//             wave of the same frequency.
//
// Governing equations (standard comparator+integrator relaxation
// oscillator relationships):
//
//   Triangle/sine peak amplitude:  Vtri = Vsat * (R1 / Rf)
//   Oscillation frequency:         f    = Rf / (4 * R1 * R2 * C)
//
// All resistors are taken in ohms, C in farads, Vsat in volts.

const LIMITS = {
  resistorOhms: { min: 100, max: 10_000_000 }, // 100 ohm .. 10 Mohm
  capFarads: { min: 1e-12, max: 1e-3 }, // 1 pF .. 1000 uF
  vsat: { min: 1, max: 15 },
  frequencyHz: { min: 0.01, max: 5_000_000 },
};

function toNumber(value, fieldName) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new ValidationError(`${fieldName} must be a finite number`);
  }
  return n;
}

class ValidationError extends Error {}

function checkRange(value, { min, max }, fieldName) {
  if (value < min || value > max) {
    throw new ValidationError(
      `${fieldName} must be between ${min} and ${max} (got ${value})`
    );
  }
}

/**
 * @param {object} params
 * @param {number|string} params.Rf  comparator feedback resistor, ohms
 * @param {number|string} params.R1  comparator threshold resistor, ohms
 * @param {number|string} params.R2  integrator resistor, ohms
 * @param {number|string} params.C   integrator capacitor, farads
 * @param {number|string} params.Vsat comparator output saturation voltage, volts
 * @param {number} [cycles]   how many periods of waveform to return (default 3)
 * @param {number} [pointsPerCycle] sample density per period (default 120)
 */
function computeFunctionGenerator(params, cycles = 3, pointsPerCycle = 120) {
  const Rf = toNumber(params.Rf, "Rf");
  const R1 = toNumber(params.R1, "R1");
  const R2 = toNumber(params.R2, "R2");
  const C = toNumber(params.C, "C");
  const Vsat = toNumber(params.Vsat, "Vsat");

  checkRange(Rf, LIMITS.resistorOhms, "Rf");
  checkRange(R1, LIMITS.resistorOhms, "R1");
  checkRange(R2, LIMITS.resistorOhms, "R2");
  checkRange(C, LIMITS.capFarads, "C");
  checkRange(Vsat, LIMITS.vsat, "Vsat");

  const triangleAmplitude = Vsat * (R1 / Rf);
  const frequencyHz = Rf / (4 * R1 * R2 * C);

  checkRange(frequencyHz, LIMITS.frequencyHz, "computed frequency");

  const squareAmplitude = Vsat;
  const sineAmplitude = triangleAmplitude;
  const periodSeconds = 1 / frequencyHz;

  const totalPoints = Math.round(cycles * pointsPerCycle);
  const square = new Array(totalPoints + 1);
  const triangle = new Array(totalPoints + 1);
  const sine = new Array(totalPoints + 1);

  for (let i = 0; i <= totalPoints; i++) {
    const t = (i / pointsPerCycle) * periodSeconds; // seconds
    const phase = (i / pointsPerCycle) % 1; // 0..1 within current cycle

    const squareV = phase < 0.5 ? squareAmplitude : -squareAmplitude;

    const triangleV =
      phase < 0.5
        ? -triangleAmplitude + 4 * triangleAmplitude * phase
        : 3 * triangleAmplitude - 4 * triangleAmplitude * phase;

    const sineV = sineAmplitude * Math.sin(2 * Math.PI * (phase - 0.25));

    square[i] = { t, v: squareV };
    triangle[i] = { t, v: triangleV };
    sine[i] = { t, v: sineV };
  }

  return {
    inputs: { Rf, R1, R2, C, Vsat },
    frequencyHz,
    periodSeconds,
    squareAmplitude,
    triangleAmplitude,
    sineAmplitude,
    waveforms: { square, triangle, sine },
  };
}

module.exports = { computeFunctionGenerator, ValidationError, LIMITS };
