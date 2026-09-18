import { useState } from "react";
import FunctionGenerator from "./FunctionGenerator";

const menuItems = [
  { id: "aim", label: "Aim" },
  { id: "theory", label: "Theory" },
  { id: "pretest", label: "Pretest" },
  { id: "procedure", label: "Procedure" },
  { id: "oscilloscope", label: "Oscilloscope Tutorial" },
  { id: "simulation", label: "Simulation" },
  { id: "posttest", label: "Posttest" },
  { id: "references", label: "References" },
  { id: "contributors", label: "Contributors" },
  { id: "feedback", label: "Feedback" },
];

function ExperimentLab() {
  const [activeSection, setActiveSection] = useState("aim");

  const handleSectionChange = (id) => {
    setActiveSection(id);

    const element = document.getElementById(id);

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  return (
    <div className="experiment-lab-page">

      {/* ================= HEADER ================= */}

      <header className="experiment-lab-header">

        <div className="experiment-lab-menu">
          ☰
        </div>

        <div className="experiment-lab-logo">
          <div className="experiment-lab-logo-symbol">
            ⚗
          </div>

          <div>
            <strong>Virtual Labs</strong>
            <small>BIET Jhansi</small>
          </div>
        </div>

        <div className="experiment-lab-title">
          Function generator using operational amplifier
        </div>

        <div className="experiment-lab-rating">
          ★ ★ ★ ★ ☆
        </div>

        <button className="experiment-header-btn">
          Rate Me
        </button>

        <button className="experiment-header-btn">
          Report a Bug
        </button>

      </header>

      <div className="experiment-orange-line"></div>


      {/* ================= BODY ================= */}

      <div className="experiment-lab-body">

        {/* ================= SIDEBAR ================= */}

        <aside className="experiment-sidebar">

          {menuItems.map((item) => (
            <button
              key={item.id}
              className={
                activeSection === item.id
                  ? "experiment-sidebar-item active"
                  : "experiment-sidebar-item"
              }
              onClick={() => handleSectionChange(item.id)}
            >
              {item.label}
            </button>
          ))}

        </aside>


        {/* ================= CONTENT ================= */}

        <main className="experiment-lab-content">

          {/* AIM */}

          <section id="aim" className="lab-section">

            <h1>Aim</h1>

            <p>
              To design and study a function generator using operational
              amplifiers and observe the generation of square, triangular
              and sine waveforms.
            </p>

            <p>
              The effect of circuit parameters such as resistance,
              capacitance and op-amp saturation voltage on the generated
              waveform frequency and amplitude is also studied.
            </p>

          </section>


          {/* THEORY */}

          <section id="theory" className="lab-section">

            <h1>Theory</h1>

            <h2>Function Generator</h2>

            <p>
              A function generator is an electronic circuit that produces
              different periodic waveforms such as square, triangular and
              sine waves.
            </p>

            <p>
              In this experiment, operational amplifiers are used to
              construct a relaxation oscillator. The comparator generates
              a square wave, while the integrator converts the square wave
              into a triangular waveform. A sine-shaping stage produces
              an approximately sinusoidal waveform.
            </p>

            <h2>Working Principle</h2>

            <ol>
              <li>
                The comparator or Schmitt trigger switches between positive
                and negative saturation voltages.
              </li>

              <li>
                This produces a square waveform at the comparator output.
              </li>

              <li>
                The square wave is applied to an op-amp integrator.
              </li>

              <li>
                The integrator converts the square wave into a triangular
                waveform.
              </li>

              <li>
                A sine-shaping stage converts the triangular waveform into
                an approximately sinusoidal waveform.
              </li>
            </ol>

            <h2>Important Equations</h2>

            <div className="formula-box">
              <p>
                <strong>Triangle/Sine peak amplitude:</strong>
              </p>

              <p className="formula">
                V<sub>tri</sub> = V<sub>sat</sub> × (R1 / Rf)
              </p>

              <p>
                <strong>Oscillation frequency:</strong>
              </p>

              <p className="formula">
                f = Rf / (4 × R1 × R2 × C)
              </p>
            </div>

            <p>
              Where Rf is the comparator feedback resistance, R1 is the
              threshold resistance, R2 is the integrator resistance,
              C is the integrator capacitance and Vsat is the op-amp
              saturation voltage.
            </p>

          </section>


          {/* PRETEST */}

          <section id="pretest" className="lab-section">

            <h1>Pretest</h1>

            <div className="question-card">
              <h3>1. Which circuit generates the square wave?</h3>

              <label>
                <input type="radio" name="pre1" />
                Comparator / Schmitt trigger
              </label>

              <label>
                <input type="radio" name="pre1" />
                Integrator
              </label>

              <label>
                <input type="radio" name="pre1" />
                Differentiator
              </label>
            </div>


            <div className="question-card">

              <h3>2. What waveform is obtained from the integrator?</h3>

              <label>
                <input type="radio" name="pre2" />
                Square
              </label>

              <label>
                <input type="radio" name="pre2" />
                Triangular
              </label>

              <label>
                <input type="radio" name="pre2" />
                DC
              </label>

            </div>


            <div className="question-card">

              <h3>3. What happens to frequency when capacitance increases?</h3>

              <label>
                <input type="radio" name="pre3" />
                Frequency increases
              </label>

              <label>
                <input type="radio" name="pre3" />
                Frequency decreases
              </label>

              <label>
                <input type="radio" name="pre3" />
                Frequency remains unchanged
              </label>

            </div>

          </section>


          {/* PROCEDURE */}

          <section id="procedure" className="lab-section">

            <h1>Procedure</h1>

            <ol className="procedure-list">

              <li>
                Open the Function Generator experiment.
              </li>

              <li>
                Turn the power ON using the power control.
              </li>

              <li>
                Observe the circuit consisting of operational amplifiers,
                resistors and capacitor.
              </li>

              <li>
                Set the values of Rf, R1, R2, C and Vsat.
              </li>

              <li>
                Click on <strong>Run Simulation</strong>.
              </li>

              <li>
                Observe the square, triangular and sine waveforms on the
                oscilloscope.
              </li>

              <li>
                Note the theoretical frequency displayed by the simulator.
              </li>

              <li>
                Read the frequency from the oscilloscope and enter the
                measured frequency in the observation section.
              </li>

              <li>
                Click <strong>Save Observation</strong>.
              </li>

              <li>
                Compare the theoretical and measured values and calculate
                the percentage error.
              </li>

            </ol>

          </section>


          {/* OSCILLOSCOPE TUTORIAL */}

          <section id="oscilloscope" className="lab-section">

            <h1>Oscilloscope Tutorial</h1>

            <h2>How to read the waveform</h2>

            <ol>

              <li>
                Turn the power ON.
              </li>

              <li>
                Run the simulation.
              </li>

              <li>
                Use Channel 1 to observe the square waveform.
              </li>

              <li>
                Use Channel 2 to observe the triangular waveform.
              </li>

              <li>
                Use Channel 3 to observe the sine waveform.
              </li>

              <li>
                Use the Phase slider to change the displayed phase.
              </li>

            </ol>

            <div className="tutorial-box">

              <h3>Frequency Measurement</h3>

              <p>
                Frequency can be calculated from the time period:
              </p>

              <p className="formula">
                f = 1 / T
              </p>

              <p>
                Count the time required for one complete waveform cycle
                and calculate its reciprocal.
              </p>

            </div>

          </section>


          {/* SIMULATION */}

          <section id="simulation" className="lab-section simulation-section">

            <h1>Simulation</h1>

            <p className="section-description">
              Adjust the circuit parameters and run the simulation to
              observe the generated waveforms.
            </p>

            <FunctionGenerator embedded />

          </section>


          {/* POSTTEST */}

          <section id="posttest" className="lab-section">

            <h1>Posttest</h1>

            <div className="question-card">

              <h3>
                1. Which component determines the charging rate of the
                integrator?
              </h3>

              <label>
                <input type="radio" name="post1" />
                R2 and C
              </label>

              <label>
                <input type="radio" name="post1" />
                Only Vsat
              </label>

              <label>
                <input type="radio" name="post1" />
                Only Rf
              </label>

            </div>


            <div className="question-card">

              <h3>
                2. What is the relationship between frequency and C?
              </h3>

              <label>
                <input type="radio" name="post2" />
                Directly proportional
              </label>

              <label>
                <input type="radio" name="post2" />
                Inversely proportional
              </label>

              <label>
                <input type="radio" name="post2" />
                No relationship
              </label>

            </div>


            <div className="question-card">

              <h3>
                3. Which waveform is produced directly by the comparator?
              </h3>

              <label>
                <input type="radio" name="post3" />
                Square
              </label>

              <label>
                <input type="radio" name="post3" />
                Triangle
              </label>

              <label>
                <input type="radio" name="post3" />
                Sine
              </label>

            </div>

          </section>


          {/* REFERENCES */}

          <section id="references" className="lab-section">

            <h1>References</h1>

            <ol>

              <li>
                Ramakant A. Gayakwad, <em>Op-Amps and Linear Integrated
                Circuits</em>.
              </li>

              <li>
                D. Roy Choudhury and Shail B. Jain,
                <em>Linear Integrated Circuits</em>.
              </li>

              <li>
                Virtual Labs – Ministry of Education, Government of India.
              </li>

              <li>
                Operational amplifier and waveform generator
                laboratory concepts.
              </li>

            </ol>

          </section>


          {/* CONTRIBUTORS */}

          <section id="contributors" className="lab-section">

            <h1>Contributors</h1>

            <div className="contributors-card">

              <h3>BIET Jhansi Virtual Electronics Laboratory</h3>

              <p>
                This experiment is part of the Virtual Electronics
                Laboratory developed for educational and experimental
                learning.
              </p>

              <p>
                Experiment: Function Generator using Operational Amplifier
              </p>

            </div>

          </section>


          {/* FEEDBACK */}

          <section id="feedback" className="lab-section">

            <h1>Feedback</h1>

            <form
              className="feedback-form"
              onSubmit={(e) => {
                e.preventDefault();
                alert("Thank you for your feedback!");
                e.target.reset();
              }}
            >

              <label>
                Name
              </label>

              <input
                type="text"
                placeholder="Enter your name"
                required
              />

              <label>
                Rating
              </label>

              <select required>
                <option value="">Select rating</option>
                <option value="5">★★★★★ Excellent</option>
                <option value="4">★★★★ Very Good</option>
                <option value="3">★★★ Good</option>
                <option value="2">★★ Fair</option>
                <option value="1">★ Poor</option>
              </select>

              <label>
                Feedback
              </label>

              <textarea
                rows="5"
                placeholder="Enter your feedback"
                required
              />

              <button type="submit">
                Submit Feedback
              </button>

            </form>

          </section>

        </main>

      </div>

    </div>
  );
}

export default ExperimentLab;