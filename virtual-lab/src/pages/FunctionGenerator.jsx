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

function FunctionGenerator({ embedded = false }) {
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

  const [connectionStatus, setConnectionStatus] = useState("not-checked");
const [connectionMessage, setConnectionMessage] = useState("");
const [experimentStarted, setExperimentStarted] = useState(false);

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
  // Interactive patch terminals for the IIT-style circuit.
  // Only A-G1, B-G2, C-G3 and D-G4 are valid.
  // Coordinates are based on the actual IIT circuit image (1540 x 784).
  // The circuit image occupies the left 80% of the workspace and the G1-G4
  // patch points sit in a separate right-side patch column, matching the
  // reference layout.
  const terminals = [
    // Output / connection points on the actual circuit image
    { id: "A",  x: 1207, y: 52,  type: "user",   label: "A"  }, // Square
    { id: "B",  x: 1282, y: 141, type: "user",   label: "B"  }, // Triangular
    { id: "C",  x: 1504, y: 454, type: "user",   label: "C"  }, // Sine
    { id: "D",  x: 1321, y: 671, type: "user",   label: "D"  }, // Ground

    // Separate patch points on the right side
    { id: "G1", x: 1820, y: 14,  type: "ground", label: "G1" },
    { id: "G2", x: 1820, y: 124, type: "ground", label: "G2" },
    { id: "G3", x: 1820, y: 424, type: "ground", label: "G3" },
    { id: "G4", x: 1820, y: 630, type: "ground", label: "G4" },
  ];

const CORRECT_CONNECTIONS = [
  ["A", "G1"],
  ["B", "G2"],
  ["C", "G3"],
  ["D", "G4"],
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
    // Wiring happens BEFORE Power is ON.
    // Flow: connect -> check -> start -> power -> simulate.
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
      setConnections((prev) => [
        ...prev,
        {
          from: selectedTerminal,
          to: terminalId,
        },
      ]);

      // Any wiring change requires a fresh connection check.
      setConnectionStatus("not-checked");
      setConnectionMessage("");
      setExperimentStarted(false);
      setPowerOn(false);
      setSimResult(null);
      setSimError("");
    }

    setSelectedTerminal(null);
  };

  const clearConnections = () => {
    setConnections([]);
    setSelectedTerminal(null);
  };

  const normalizeConnection = (from, to) => {
  return [from, to].sort().join("-");
};


const checkConnections = () => {
  const actual = connections.map((connection) =>
    normalizeConnection(
      connection.from,
      connection.to
    )
  );

  const expected = CORRECT_CONNECTIONS.map(
    ([from, to]) =>
      normalizeConnection(from, to)
  );

  const isCorrect =
    actual.length === expected.length &&
    expected.every((connection) =>
      actual.includes(connection)
    );

  if (isCorrect) {
    setConnectionStatus("correct");

    setConnectionMessage(
      "Correct connections! You can now start the experiment."
    );

    return true;
  }

  setConnectionStatus("wrong");

  setConnectionMessage(
    "Incorrect connections. Connect A-G1, B-G2, C-G3 and D-G4."
  );

  setExperimentStarted(false);

  return false;
};

const startExperiment = () => {
  if (connectionStatus !== "correct") {
    setConnectionMessage(
      "Check and correct the circuit connections first."
    );

    setConnectionStatus("wrong");

    return;
  }

  setExperimentStarted(true);
  setPowerOn(true);

  setSimError("");
  setSimResult(null);
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

  // 1. Connections must be checked
  if (connectionStatus !== "correct") {
    setSimError(
      "Correct the circuit connections before running the simulation."
    );

    return;
  }


  // 2. Experiment must be started
  if (!experimentStarted) {
    setSimError(
      "Click Start after checking the circuit connections."
    );

    return;
  }


  // 3. Power must be ON
  if (!powerOn) {
    setSimError(
      "Turn Power ON before running the simulation."
    );

    return;
  }


  setSimLoading(true);
  setSimError("");


  try {

    const result =
      await simulateFunctionGenerator({

        Rf: Number(rfK) * 1000,

        R1: Number(r1K) * 1000,

        R2: Number(r2K) * 1000,

        C: Number(cNF) * 1e-9,

        Vsat: Number(vsat),

      });


    setSimResult(result);

  } catch (err) {

    setSimResult(null);

    setSimError(
      err.message ||
      "Simulation failed"
    );

  } finally {

    setSimLoading(false);

  }
};

const getWirePath = (from, to) => {

  const midX =
    (from.x + to.x) / 2;

  return `
    M ${from.x} ${from.y}
    L ${midX} ${from.y}
    L ${midX} ${to.y}
    L ${to.x} ${to.y}
  `;
};

  const handleSaveObservation = async (e) => {
    
    e.preventDefault();
    setSaveError("");
    setSaveSuccess("");

    if (connectionStatus !== "correct") {
  setSaveError(
    "Observation cannot be saved until the circuit is correctly connected."
  );

  return;
}

if (!experimentStarted) {
  setSaveError(
    "Start the experiment before saving an observation."
  );

  return;
}

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

      {!embedded && (
  <>
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

    <div className="fg-orange-line"></div>
  </>
)}


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
              viewBox="0 0 850 500"
              className="circuit-svg"
              style={{ background: "#ffffff" }}
            >
              {/* Oscilloscope frame */}
              <rect
                x="35"
                y="35"
                width="780"
                height="420"
                fill="#fff"
                stroke="#222"
                strokeWidth="2"
              />

              {/* Grid */}
              {Array.from({ length: 13 }).map((_, i) => {
                const x = 55 + i * 60;
                return (
                  <line
                    key={`vx-${i}`}
                    x1={x}
                    y1="55"
                    x2={x}
                    y2="435"
                    stroke="#d8d8d8"
                    strokeWidth="1"
                  />
                );
              })}

              {Array.from({ length: 9 }).map((_, i) => {
                const y = 55 + i * 47.5;
                return (
                  <line
                    key={`hy-${i}`}
                    x1="55"
                    y1={y}
                    x2="795"
                    y2={y}
                    stroke="#d8d8d8"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Center/reference axes */}
              <line x1="55" y1="245" x2="795" y2="245" stroke="#999" strokeWidth="1.5" />

              {/* Time labels */}
              <text x="52" y="448" fontSize="11">0</text>
              <text x="225" y="448" fontSize="11">5</text>
              <text x="395" y="448" fontSize="11">10</text>
              <text x="565" y="448" fontSize="11">15</text>
              <text x="735" y="448" fontSize="11">20</text>
              <text x="370" y="475" fontSize="12" fontWeight="bold">Time (ms)</text>

              {/* Voltage labels */}
              <text x="8" y="70" fontSize="11">+15V</text>
              <text x="22" y="250" fontSize="11">0V</text>
              <text x="8" y="432" fontSize="11">−15V</text>

              {/* Channel labels */}
              <g fontSize="12" fontWeight="bold">
                <rect x="65" y="65" width="15" height="15" fill="#1aaf45" />
                <text x="86" y="77" fill="#1aaf45">CH1 Square</text>

                <rect x="185" y="65" width="15" height="15" fill="#e0a800" />
                <text x="206" y="77" fill="#b07d00">CH2 Triangle</text>

                <rect x="330" y="65" width="15" height="15" fill="#168de2" />
                <text x="351" y="77" fill="#168de2">CH3 Sine</text>
              </g>

              {/* Waveforms — rendered only after a successful simulation */}
              {simResult && activeChannels.ch1 && (
                <polyline
                  points={wave1}
                  fill="none"
                  stroke="#1aaf45"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}

              {simResult && activeChannels.ch2 && (
                <polyline
                  points={wave2}
                  fill="none"
                  stroke="#e0a800"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}

              {simResult && activeChannels.ch3 && (
                <polyline
                  points={wave3}
                  fill="none"
                  stroke="#168de2"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}

              {/* Small channel status */}
              {simResult && (
                <text x="650" y="78" fontSize="11" fill="#555">
                  {simResult.frequencyHz.toFixed(2)} Hz
                </text>
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

  onClick={() => {

    if (!experimentStarted) {

      setSimError(
        "Check the circuit connections and click Start first."
      );

      return;
    }

    togglePower();

  }}
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

            <div
              className="circuit-workspace"
              style={{
                position: "relative",
                width: "100%",
                // 80% circuit + 20% patch-point area, like the reference.
                aspectRatio: "1925 / 784",
                overflow: "hidden",
                background: "#fff",
                border: "1px solid #ddd",
                borderRadius: "8px",
              }}
            >
              {/* Exact IIT-style reference circuit */}
              <img
                src="/assets/function-generator-circuit.png"
                alt="Function generator using operational amplifier circuit"
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: "80%",
                  height: "100%",
                  objectFit: "fill",
                  display: "block",
                }}
              />

              {/* Interactive wiring layer */}
              <svg
                viewBox="0 0 1925 784"
                preserveAspectRatio="none"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                }}
              >
                {connections.map((connection, index) => {
                  const from = terminals.find(
                    (terminal) => terminal.id === connection.from
                  );
                  const to = terminals.find(
                    (terminal) => terminal.id === connection.to
                  );

                  if (!from || !to) return null;

                  return (
                    <path
                      key={index}
                      d={getWirePath(from, to)}
                      fill="none"
                      stroke="#e60000"
                      strokeWidth="7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.9"
                    />
                  );
                })}

                {terminals.map((terminal) => {
                  const selected = selectedTerminal === terminal.id;
                  const connected = connections.some(
                    (connection) =>
                      connection.from === terminal.id ||
                      connection.to === terminal.id
                  );

                  return (
                    <g
                      key={terminal.id}
                      onClick={() => handleTerminalClick(terminal.id)}
                      style={{ cursor: "pointer" }}
                    >
                      {/* Large hit area so clicking is easy */}
                      <circle
                        cx={terminal.x}
                        cy={terminal.y}
                        r="25"
                        fill="transparent"
                      />

                      <circle
                        cx={terminal.x}
                        cy={terminal.y}
                        r={selected ? 13 : 10}
                        fill={
                          selected
                            ? "#00a8ff"
                            : connected
                              ? "#e60000"
                              : terminal.type === "user"
                                ? "#ff2020"
                                : "#008000"
                        }
                        stroke="#fff"
                        strokeWidth="4"
                      />

                      <text
                        x={terminal.x}
                        y={terminal.y - 18}
                        textAnchor="middle"
                        fontSize="22"
                        fontWeight="700"
                        fill="#111"
                        stroke="#fff"
                        strokeWidth="5"
                        paintOrder="stroke"
                      >
                        {terminal.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div
              className="connection-help"
              style={{
                marginTop: "8px",
                padding: "8px 10px",
                borderRadius: "6px",
                background: "#f7f7f7",
                fontSize: "13px",
              }}
            >
              {selectedTerminal ? (
                <>
                  Terminal <strong>{selectedTerminal}</strong> selected.
                  Click the terminal you want to connect it to.
                </>
              ) : (
                <>
                  Connect <strong>A-G1</strong>, <strong>B-G2</strong>,
                  <strong> C-G3</strong>, and <strong>D-G4</strong>.
                </>
              )}
            </div>

            {connectionMessage && (
              <div
                style={{
                  marginTop: "8px",
                  padding: "9px 10px",
                  borderRadius: "6px",
                  fontWeight: 600,
                  color:
                    connectionStatus === "correct" ? "#166534" : "#b91c1c",
                  background:
                    connectionStatus === "correct" ? "#dcfce7" : "#fee2e2",
                }}
              >
                {connectionMessage}
              </div>
            )}

            <div
              className="circuit-actions"
              style={{
                display: "flex",
                gap: "8px",
                marginTop: "10px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="check-connection-button"
                onClick={checkConnections}
              >
                Check Connections
              </button>

              <button
                type="button"
                className="start-experiment-button"
                onClick={startExperiment}
                disabled={connectionStatus !== "correct"}
              >
                Start
              </button>

              <button
                type="button"
                className="clear-wire-button"
                onClick={() => {
                  clearConnections();
                  setConnectionStatus("not-checked");
                  setConnectionMessage("");
                  setExperimentStarted(false);
                  setPowerOn(false);
                  setSimResult(null);
                  setSimError("");
                  setMeasuredFrequency("");
                  setSaveError("");
                  setSaveSuccess("");
                }}
              >
                Reset
              </button>
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

    <h3 className="observation-heading">
      Observation Table
    </h3>

    <div className="observation-table-wrapper">

      <table className="observation-table">

        <thead>

          <tr>
            <th>S.No.</th>
            <th>Rf (kΩ)</th>
            <th>R1 (kΩ)</th>
            <th>R2 (kΩ)</th>
            <th>C (nF)</th>
            <th>Vsat (V)</th>
            <th>Theoretical f (Hz)</th>
            <th>Observed f (Hz)</th>
            <th>Error (%)</th>
          </tr>

        </thead>

        <tbody>

          {results.map((r, index) => (

            <tr key={r.id}>

              <td>{index + 1}</td>

              <td>
                {(r.inputs.Rf / 1000).toFixed(2)}
              </td>

              <td>
                {(r.inputs.R1 / 1000).toFixed(2)}
              </td>

              <td>
                {(r.inputs.R2 / 1000).toFixed(2)}
              </td>

              <td>
                {(r.inputs.C * 1e9).toFixed(2)}
              </td>

              <td>
                {r.inputs.Vsat.toFixed(2)}
              </td>

              <td>
                {r.theoreticalFrequencyHz.toFixed(2)}
              </td>

              <td>
                {r.measuredFrequencyHz.toFixed(2)}
              </td>

              <td>
                {r.percentError.toFixed(2)}
              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  </div>

)}

          </section>

        </div>

      </main>

    </div>
  );
}

export default FunctionGenerator;
