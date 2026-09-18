import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchFunctionGeneratorResults,
  isLoggedIn,
  saveFunctionGeneratorResult,
  simulateFunctionGenerator,
} from "../api";

// Sample density used by the backend simulator (lib/simulate.js defaults).
const POINTS_PER_CYCLE = 120;

function FunctionGenerator() {
  const navigate = useNavigate();

  const [powerOn, setPowerOn] = useState(false);

  // Circuit component values, entered in convenient lab units and
  // converted to SI (ohms / farads) before being sent to the backend.
  const [rfK, setRfK] = useState(100); // comparator feedback resistor, kΩ
  const [r1K, setR1K] = useState(33); // comparator threshold resistor, kΩ
  const [r2K, setR2K] = useState(10); // integrator resistor, kΩ
  const [cNF, setCNF] = useState(100); // integrator capacitor, nF
  const [vsat, setVsat] = useState(13); // op-amp saturation voltage, V

  const [phase, setPhase] = useState(0);

  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState("");

  const [measuredFrequency, setMeasuredFrequency] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [results, setResults] = useState([]);

  const [selectedTerminal, setSelectedTerminal] = useState(null);
  const [connections, setConnections] = useState([]);

  const [activeChannels, setActiveChannels] = useState({
    ch1: true,
    ch2: true,
    ch3: true,
  });

  // Route guard: this page needs a logged-in student.
  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/student-login");
    }
  }, [navigate]);

  useEffect(() => {
    fetchFunctionGeneratorResults()
      .then((data) => setResults(data.results))
      .catch(() => {
        /* non-fatal: the observation log is a convenience, not required */
      });
  }, []);

  /*
   * Fixed circuit terminals.
   * x and y are positions inside the circuit SVG.
   */
  const terminals = [
    { id: "T1", x: 90, y: 95 },
    { id: "T2", x: 90, y: 315 },

    { id: "T3", x: 230, y: 95 },
    { id: "T4", x: 230, y: 315 },

    { id: "T5", x: 350, y: 95 },
    { id: "T6", x: 350, y: 315 },

    { id: "T7", x: 500, y: 95 },
    { id: "T8", x: 500, y: 315 },

    { id: "T9", x: 650, y: 95 },
    { id: "T10", x: 650, y: 315 },

    { id: "T11", x: 770, y: 145 },
    { id: "T12", x: 770, y: 215 },
  ];

  /*
   * Generate node numbers.
   * Every connected pair gets the same number.
   */
  const nodeNumbers = useMemo(() => {
    const nodes = {};

    terminals.forEach((terminal) => {
      nodes[terminal.id] = null;
    });

    connections.forEach((connection, index) => {
      const number = index + 1;

      nodes[connection.from] = number;
      nodes[connection.to] = number;
    });

    return nodes;
  }, [connections]);

  const handleTerminalClick = (terminalId) => {
    if (!powerOn) {
      alert("Turn Power ON before connecting the circuit.");
      return;
    }

    if (!selectedTerminal) {
      setSelectedTerminal(terminalId);
      return;
    }

    if (selectedTerminal === terminalId) {
      setSelectedTerminal(null);
      return;
    }

    const alreadyConnected = connections.some(
      (connection) =>
        (connection.from === selectedTerminal &&
          connection.to === terminalId) ||
        (connection.from === terminalId &&
          connection.to === selectedTerminal)
    );

    if (!alreadyConnected) {
      setConnections([
        ...connections,
        {
          from: selectedTerminal,
          to: terminalId,
        },
      ]);
    }

    setSelectedTerminal(null);
  };

  const clearConnections = () => {
    setConnections([]);
    setSelectedTerminal(null);
  };

  const toggleChannel = (channel) => {
    setActiveChannels({
      ...activeChannels,
      [channel]: !activeChannels[channel],
    });
  };

  const togglePower = () => {
    const next = !powerOn;
    setPowerOn(next);
    if (!next) {
      setSimResult(null);
      setSimError("");
    }
  };

  const runSimulation = async () => {
    if (!powerOn) {
      setSimError("Turn Power ON before running the simulation.");
      return;
    }

    setSimLoading(true);
    setSimError("");

    try {
      const result = await simulateFunctionGenerator({
        Rf: Number(rfK) * 1000,
        R1: Number(r1K) * 1000,
        R2: Number(r2K) * 1000,
        C: Number(cNF) * 1e-9,
        Vsat: Number(vsat),
      });
      setSimResult(result);
    } catch (err) {
      setSimResult(null);
      setSimError(err.message || "Simulation failed");
    } finally {
      setSimLoading(false);
    }
  };

  const handleSaveObservation = async (e) => {
    e.preventDefault();
    setSaveError("");
    setSaveSuccess("");

    if (!simResult) {
      setSaveError("Run the simulation before saving an observation.");
      return;
    }

    if (!measuredFrequency) {
      setSaveError("Enter the frequency you measured on the oscilloscope.");
      return;
    }

    try {
      const record = await saveFunctionGeneratorResult({
        ...simResult.inputs,
        measuredFrequencyHz: Number(measuredFrequency),
      });
      setResults([record, ...results]);
      setSaveSuccess(
        `Saved. ${record.percentError.toFixed(2)}% error vs. theoretical value.`
      );
      setMeasuredFrequency("");
    } catch (err) {
      setSaveError(err.message || "Could not save observation");
    }
  };

  /*
   * Map a backend-computed waveform (array of {t, v} samples covering
   * several full cycles) onto oscilloscope pixel coordinates, applying
   * the cosmetic phase-shift control.
   */
  const mapWaveform = (waveformPoints, centerY, pxPerVolt) => {
    if (!waveformPoints || waveformPoints.length === 0) return "";

    const totalPoints = waveformPoints.length - 1;
    const phaseShiftIdx = Math.round((phase / 360) * POINTS_PER_CYCLE);
    const pts = [];

    for (let x = 0; x <= 760; x += 4) {
      const rawIdx = Math.round((x / 760) * totalPoints);
      const idx =
        (((rawIdx + phaseShiftIdx) % (totalPoints + 1)) + (totalPoints + 1)) %
        (totalPoints + 1);
      const v = waveformPoints[idx].v;
      const y = centerY - v * pxPerVolt;
      pts.push(`${x + 20},${y}`);
    }

    return pts.join(" ");
  };

  const PX_PER_VOLT = 2.5;

  const wave1 = simResult ? mapWaveform(simResult.waveforms.square, 90, PX_PER_VOLT) : "";
  const wave2 = simResult ? mapWaveform(simResult.waveforms.triangle, 190, PX_PER_VOLT) : "";
  const wave3 = simResult ? mapWaveform(simResult.waveforms.sine, 290, PX_PER_VOLT) : "";

  return (
    <div className="function-generator-page">

      {/* =========================================
          TOP HEADER
          ========================================= */}

      <header className="fg-header">

        <div className="fg-menu">
          ☰
        </div>

        <div className="fg-logo">
          <div className="fg-logo-symbol">
            ⚗
          </div>

          <div>
            <strong>Virtual Labs</strong>
            <small>BIET Jhansi</small>
          </div>
        </div>

        <div className="fg-title">
          Function generator using operational amplifier
        </div>

        <div className="fg-rating">
          ★ ★ ★ ★ ☆
        </div>

        <button className="fg-header-button">
          Rate Me
        </button>

        <button className="fg-header-button">
          Report a Bug
        </button>

      </header>


      {/* ORANGE LINE */}

      <div className="fg-orange-line"></div>


      {/* =========================================
          MAIN SIMULATION
          ========================================= */}

      <main className="fg-main">

        {/* =====================================
            OSCILLOSCOPE
            ===================================== */}

        <section className="fg-panel oscilloscope-panel">

          <div className="fg-panel-title">
            OSCILLOSCOPE
          </div>

          <div className="scope-screen">

            <svg
              viewBox="0 0 800 360"
              className="scope-svg"
            >

              {/* Grid */}

              <defs>

                <pattern
                  id="scopeGrid"
                  width="40"
                  height="30"
                  patternUnits="userSpaceOnUse"
                >

                  <path
                    d="M 40 0 L 0 0 0 30"
                    fill="none"
                    stroke="#d9d9d9"
                    strokeWidth="1"
                  />

                </pattern>

              </defs>

              <rect
                width="800"
                height="360"
                fill="url(#scopeGrid)"
              />


              {/* Centre lines */}

              <line
                x1="20"
                y1="120"
                x2="780"
                y2="120"
                stroke="#c7c7c7"
              />

              <line
                x1="20"
                y1="240"
                x2="780"
                y2="240"
                stroke="#c7c7c7"
              />


              {/* Square */}

              {powerOn && simResult && activeChannels.ch1 && (

                <polyline
                  points={wave1}
                  fill="none"
                  stroke="#159b25"
                  strokeWidth="4"
                />

              )}


              {/* Triangle */}

              {powerOn && simResult && activeChannels.ch2 && (

                <polyline
                  points={wave2}
                  fill="none"
                  stroke="#244de8"
                  strokeWidth="4"
                />

              )}


              {/* Sine */}

              {powerOn && simResult && activeChannels.ch3 && (

                <polyline
                  points={wave3}
                  fill="none"
                  stroke="#f49b00"
                  strokeWidth="4"
                />

              )}

            </svg>


            {!powerOn && (

              <div className="scope-off">
                POWER OFF
              </div>

            )}

            {powerOn && !simResult && !simLoading && (

              <div className="scope-off">
                {simError ? "SIMULATION ERROR" : "PRESS \"RUN SIMULATION\" →"}
              </div>

            )}

            {powerOn && simLoading && (

              <div className="scope-off">
                RUNNING SIMULATION...
              </div>

            )}

          </div>


          {/* Oscilloscope Controls */}

          <div className="scope-controls">

            <div className="scope-buttons">

              <button
                className={
                  activeChannels.ch1
                    ? "channel-button active-green"
                    : "channel-button"
                }
                onClick={() => toggleChannel("ch1")}
              >
                Channel 1 (Square)
              </button>

              <button
                className={
                  activeChannels.ch2
                    ? "channel-button active-blue"
                    : "channel-button"
                }
                onClick={() => toggleChannel("ch2")}
              >
                Channel 2 (Triangle)
              </button>

              <button
                className={
                  activeChannels.ch3
                    ? "channel-button active-orange"
                    : "channel-button"
                }
                onClick={() => toggleChannel("ch3")}
              >
                Channel 3 (Sine)
              </button>

              <button className="channel-button">
                Ground
              </button>

              <button className="channel-button">
                Dual
              </button>

            </div>


            <div className="scope-slider-row">

              <label>
                Phase
              </label>

              <input
                type="range"
                min="0"
                max="360"
                value={phase}
                onChange={(e) =>
                  setPhase(Number(e.target.value))
                }
              />

              <span>
                {phase}°
              </span>

            </div>


            <button
              className={
                powerOn
                  ? "power-button power-on"
                  : "power-button"
              }
              onClick={togglePower}
            >
              Power: {powerOn ? "On" : "Off"}
            </button>

          </div>

        </section>


        {/* =====================================
            RIGHT SIDE
            ===================================== */}

        <div className="fg-right-column">


          {/* ===================================
              CIRCUIT
              =================================== */}

          <section className="fg-panel circuit-panel">

            <div className="fg-panel-title">
              CIRCUIT
            </div>


            <div className="circuit-workspace">

              <svg
                viewBox="0 0 850 380"
                className="circuit-svg"
              >

                {/* ==========================
                    POWER RAILS
                    ========================== */}

                <line
                  x1="40"
                  y1="70"
                  x2="810"
                  y2="70"
                  stroke="#222"
                  strokeWidth="3"
                />

                <line
                  x1="40"
                  y1="330"
                  x2="810"
                  y2="330"
                  stroke="#222"
                  strokeWidth="3"
                />

                <text
                  x="15"
                  y="65"
                  fontSize="15"
                >
                  V+
                </text>

                <text
                  x="15"
                  y="335"
                  fontSize="15"
                >
                  V−
                </text>


                {/* ==========================
                    OP AMP 1
                    ========================== */}

                <polygon
                  points="160,120 160,220 270,170"
                  fill="#ffffff"
                  stroke="#222"
                  strokeWidth="3"
                />

                <text
                  x="180"
                  y="168"
                  fontSize="14"
                  fontWeight="bold"
                >
                  LM741
                </text>

                <text
                  x="145"
                  y="145"
                  fontSize="18"
                >
                  −
                </text>

                <text
                  x="145"
                  y="205"
                  fontSize="18"
                >
                  +
                </text>


                {/* ==========================
                    RESISTOR 1
                    ========================== */}

                <rect
                  x="80"
                  y="135"
                  width="70"
                  height="20"
                  fill="#f5e4bd"
                  stroke="#8b6b32"
                  strokeWidth="2"
                />

                <text
                  x="88"
                  y="129"
                  fontSize="11"
                >
                  R1 {r1K}KΩ
                </text>


                {/* ==========================
                    OP AMP 2
                    ========================== */}

                <polygon
                  points="330,120 330,220 440,170"
                  fill="#ffffff"
                  stroke="#222"
                  strokeWidth="3"
                />

                <text
                  x="350"
                  y="168"
                  fontSize="14"
                  fontWeight="bold"
                >
                  LM741
                </text>

                <text
                  x="315"
                  y="145"
                  fontSize="18"
                >
                  −
                </text>

                <text
                  x="315"
                  y="205"
                  fontSize="18"
                >
                  +
                </text>


                {/* ==========================
                    CAPACITOR
                    ========================== */}

                <line
                  x1="300"
                  y1="95"
                  x2="300"
                  y2="145"
                  stroke="#222"
                  strokeWidth="3"
                />

                <line
                  x1="290"
                  y1="145"
                  x2="310"
                  y2="145"
                  stroke="#222"
                  strokeWidth="4"
                />

                <line
                  x1="290"
                  y1="155"
                  x2="310"
                  y2="155"
                  stroke="#222"
                  strokeWidth="4"
                />

                <line
                  x1="300"
                  y1="155"
                  x2="300"
                  y2="205"
                  stroke="#222"
                  strokeWidth="3"
                />

                <text
                  x="315"
                  y="145"
                  fontSize="11"
                >
                  C1 {cNF}nF
                </text>


                {/* ==========================
                    OP AMP 3
                    ========================== */}

                <polygon
                  points="500,120 500,220 610,170"
                  fill="#ffffff"
                  stroke="#222"
                  strokeWidth="3"
                />

                <text
                  x="520"
                  y="168"
                  fontSize="14"
                  fontWeight="bold"
                >
                  LM741
                </text>

                <text
                  x="485"
                  y="145"
                  fontSize="18"
                >
                  −
                </text>

                <text
                  x="485"
                  y="205"
                  fontSize="18"
                >
                  +
                </text>


                {/* ==========================
                    OP AMP 4
                    ========================== */}

                <polygon
                  points="650,120 650,220 760,170"
                  fill="#ffffff"
                  stroke="#222"
                  strokeWidth="3"
                />

                <text
                  x="670"
                  y="168"
                  fontSize="14"
                  fontWeight="bold"
                >
                  LM741
                </text>


                {/* ==========================
                    FEEDBACK WIRES
                    ========================== */}

                <path
                  d="M270 170 L270 280 L110 280 L110 155"
                  fill="none"
                  stroke="#333"
                  strokeWidth="2"
                />

                <path
                  d="M440 170 L440 300 L300 300"
                  fill="none"
                  stroke="#333"
                  strokeWidth="2"
                />


                {/* ==========================
                    OUTPUT LABELS
                    ========================== */}

                <text
                  x="780"
                  y="115"
                  fontSize="14"
                  fontWeight="bold"
                >
                  Square
                </text>

                <text
                  x="780"
                  y="170"
                  fontSize="14"
                  fontWeight="bold"
                >
                  Triangular
                </text>

                <text
                  x="780"
                  y="225"
                  fontSize="14"
                  fontWeight="bold"
                >
                  Sine
                </text>


                {/* ==========================
                    MANUAL CONNECTION WIRES
                    ========================== */}

                {connections.map((connection, index) => {

                  const from = terminals.find(
                    (terminal) =>
                      terminal.id === connection.from
                  );

                  const to = terminals.find(
                    (terminal) =>
                      terminal.id === connection.to
                  );

                  if (!from || !to) return null;

                  return (
                    <g key={index}>

                      <line
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke="#e60000"
                        strokeWidth="4"
                      />

                    </g>
                  );

                })}


                {/* ==========================
                    TERMINALS
                    ========================== */}

                {terminals.map((terminal) => {

                  const selected =
                    selectedTerminal === terminal.id;

                  return (
                    <g
                      key={terminal.id}
                      onClick={() =>
                        handleTerminalClick(
                          terminal.id
                        )
                      }
                      style={{
                        cursor: "pointer",
                      }}
                    >

                      <circle
                        cx={terminal.x}
                        cy={terminal.y}
                        r={selected ? 9 : 7}
                        fill={
                          selected
                            ? "#00aaff"
                            : "#ff2020"
                        }
                        stroke="#ffffff"
                        strokeWidth="3"
                      />

                      {nodeNumbers[terminal.id] && (

                        <text
                          x={terminal.x + 8}
                          y={terminal.y - 8}
                          fontSize="12"
                          fontWeight="bold"
                          fill="#d00000"
                        >
                          N{nodeNumbers[terminal.id]}
                        </text>

                      )}

                    </g>
                  );

                })}

              </svg>


              <div className="connection-help">

                {selectedTerminal ? (
                  <>
                    Terminal <strong>{selectedTerminal}</strong>{" "}
                    selected. Click another terminal to connect.
                  </>
                ) : (
                  <>
                    Click any red terminal, then click another
                    terminal to connect them.
                  </>
                )}

              </div>


              <div className="circuit-actions">

                <button
                  className="clear-wire-button"
                  onClick={clearConnections}
                >
                  Clear Wires
                </button>

              </div>

            </div>

          </section>


          {/* ===================================
              CIRCUIT PARAMETERS + RUN
              (this is the actual simulation input:
              the backend computes frequency/amplitude
              from these R/C values in real time)
              =================================== */}

          <section className="fg-panel controls-panel">

            <div className="fg-panel-title">
              CIRCUIT PARAMETERS
            </div>

            <div className="fg-param-form">

              <div className="fg-param-row">
                <label>Rf - comparator feedback (kΩ)</label>
                <input
                  type="number"
                  min="0.1"
                  step="1"
                  value={rfK}
                  onChange={(e) => setRfK(e.target.value)}
                />
              </div>

              <div className="fg-param-row">
                <label>R1 - comparator threshold (kΩ)</label>
                <input
                  type="number"
                  min="0.1"
                  step="1"
                  value={r1K}
                  onChange={(e) => setR1K(e.target.value)}
                />
              </div>

              <div className="fg-param-row">
                <label>R2 - integrator resistor (kΩ)</label>
                <input
                  type="number"
                  min="0.1"
                  step="1"
                  value={r2K}
                  onChange={(e) => setR2K(e.target.value)}
                />
              </div>

              <div className="fg-param-row">
                <label>C - integrator capacitor (nF)</label>
                <input
                  type="number"
                  min="0.001"
                  step="1"
                  value={cNF}
                  onChange={(e) => setCNF(e.target.value)}
                />
              </div>

              <div className="fg-param-row">
                <label>Vsat - op-amp saturation (V)</label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  step="0.5"
                  value={vsat}
                  onChange={(e) => setVsat(e.target.value)}
                />
              </div>

              <div className="fg-param-actions">
                <button
                  className="fg-run-button"
                  onClick={runSimulation}
                  disabled={simLoading}
                >
                  {simLoading ? "Running..." : "Run Simulation"}
                </button>
              </div>

              {simError && (
                <div className="fg-error">{simError}</div>
              )}

              {simResult && (
                <div className="fg-readout">
                  Theoretical frequency: <strong>{simResult.frequencyHz.toFixed(2)} Hz</strong><br />
                  Square amplitude: <strong>±{simResult.squareAmplitude.toFixed(2)} V</strong><br />
                  Triangle / Sine amplitude: <strong>±{simResult.triangleAmplitude.toFixed(2)} V</strong>
                </div>
              )}

            </div>

          </section>


          {/* ===================================
              OBSERVATION / RESULT LOG
              =================================== */}

          <section className="fg-panel controls-panel">

            <div className="fg-panel-title">
              OBSERVATION
            </div>

            <p style={{ fontSize: "13px", marginBottom: "6px" }}>
              Read the frequency off the oscilloscope grid, enter it below,
              and save your observation to compare against the theoretical
              value.
            </p>

            <form className="fg-observation-form" onSubmit={handleSaveObservation}>

              <input
                type="number"
                step="0.01"
                placeholder="Measured frequency (Hz)"
                value={measuredFrequency}
                onChange={(e) => setMeasuredFrequency(e.target.value)}
              />

              <button type="submit" className="fg-submit-button">
                Save Observation
              </button>

            </form>

            {saveError && <div className="fg-error">{saveError}</div>}
            {saveSuccess && (
              <div className="fg-readout">{saveSuccess}</div>
            )}

            {results.length > 0 && (

              <div className="fg-results-list">

                <table>
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Theoretical (Hz)</th>
                      <th>Measured (Hz)</th>
                      <th>Error %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.id}>
                        <td>{new Date(r.submittedAt).toLocaleString()}</td>
                        <td>{r.theoreticalFrequencyHz.toFixed(2)}</td>
                        <td>{r.measuredFrequencyHz.toFixed(2)}</td>
                        <td>{r.percentError.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

              </div>

            )}

          </section>

        </div>

      </main>

    </div>
  );
}

export default FunctionGenerator;
