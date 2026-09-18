import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import bietLogo from "../assets/biet-logo.png";
import virtualLabLogo from "../assets/virtual-lab-logo.png";
import { clearSession, fetchLabExperiments, fetchLabs, getUser, isLoggedIn } from "../api";

function StudentDashboard() {
  const navigate = useNavigate();

  const [labs, setLabs] = useState([]);
  const [labsLoading, setLabsLoading] = useState(true);
  const [labsError, setLabsError] = useState("");

  const [selectedLab, setSelectedLab] = useState(null);
  const [experiments, setExperiments] = useState([]);
  const [experimentsLoading, setExperimentsLoading] = useState(false);
  const [experimentsError, setExperimentsError] = useState("");

  const user = getUser();

  // Guard the route, then load labs from the backend.
  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/student-login");
      return;
    }

    fetchLabs()
      .then((data) => setLabs(data.labs))
      .catch((err) => setLabsError(err.message || "Could not load labs"))
      .finally(() => setLabsLoading(false));
  }, [navigate]);

  const handleLabClick = (lab) => {
    setSelectedLab(lab);
    setExperiments([]);
    setExperimentsError("");
    setExperimentsLoading(true);

    fetchLabExperiments(lab.id)
      .then((data) => setExperiments(data.experiments))
      .catch((err) =>
        setExperimentsError(err.message || "Could not load experiments")
      )
      .finally(() => setExperimentsLoading(false));
  };

  const handleBack = () => {
    setSelectedLab(null);
    setExperiments([]);
    setExperimentsError("");
  };

  const handleLogout = () => {
    clearSession();
    navigate("/student-login");
  };

  const handlePerform = (experiment) => {
    if (experiment.status === "available" && experiment.route) {
      navigate(experiment.route);
    }
  };

  return (
    <div className="dashboard-page">

      {/* HEADER */}

      <header className="dashboard-header">

        <img
          src={bietLogo}
          alt="BIET Jhansi"
          className="dashboard-biet-logo"
        />

        <div className="dashboard-title">
          <h1>BIET Jhansi</h1>
          <p>Virtual Electronics Laboratory</p>
        </div>

        <div className="dashboard-right">

          <img
            src={virtualLabLogo}
            alt="Virtual Electronics Laboratory"
            className="dashboard-lab-logo"
          />

          {user && (
            <span className="dashboard-username" style={{ marginRight: "12px" }}>
              {user.name}
            </span>
          )}

          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>

        </div>

      </header>


      {/* MAIN CONTENT */}

      <main className="dashboard-content">

        {!selectedLab ? (

          /* AVAILABLE LABS */

          <>
            <div className="welcome-section">
              <h2>Student Dashboard</h2>

              <p>
                Welcome to the Virtual Electronics Laboratory
              </p>
            </div>

            <section className="labs-section">

              <h3>Available Labs</h3>

              <p className="section-description">
                Select a laboratory to view its available experiments.
              </p>

              {labsLoading && <p>Loading labs...</p>}
              {labsError && <p className="login-error">{labsError}</p>}

              <div className="labs-grid">

                {labs.map((lab) => (

                  <div
                    key={lab.id}
                    className="lab-card"
                    onClick={() => handleLabClick(lab)}
                  >

                    <div className="lab-icon">
                      {lab.icon}
                    </div>

                    <div className="lab-info">

                      <h4>{lab.name}</h4>

                      <p>
                        {lab.description}
                      </p>

                    </div>

                    <button
                      className="open-lab-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLabClick(lab);
                      }}
                    >
                      Open Lab →
                    </button>

                  </div>

                ))}

              </div>

            </section>
          </>

        ) : (

          /* SELECTED LAB */

          <section className="experiments-page">

            <button
              className="back-button"
              onClick={handleBack}
            >
              ← Back to Available Labs
            </button>


            <div className="selected-lab-header">

              <div className="selected-lab-icon">
                {selectedLab.icon}
              </div>

              <div>
                <h2>{selectedLab.name}</h2>

                <p>
                  Available Experiments
                </p>
              </div>

            </div>

            {experimentsLoading && <p>Loading experiments...</p>}
            {experimentsError && <p className="login-error">{experimentsError}</p>}

            {!experimentsLoading && !experimentsError && experiments.length > 0 ? (

              /* EXPERIMENTS TABLE (data-driven, from the backend) */

              <div className="experiments-table-container">

                <table className="experiments-table">

                  <thead>
                    <tr>
                      <th>S. No.</th>
                      <th>Experiment</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>

                    {experiments.map((experiment, index) => (

                      <tr key={experiment.id}>

                        <td className="serial-number">
                          {index + 1}
                        </td>

                        <td className="experiment-name">
                          {experiment.name}
                        </td>

                        <td className="experiment-action">

                          {experiment.status === "available" ? (
                            <button
                              className="perform-button"
                              onClick={() => handlePerform(experiment)}
                            >
                              Perform →
                            </button>
                          ) : (
                            <span className="experiment-coming-soon">
                              Coming soon
                            </span>
                          )}

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            ) : (

              !experimentsLoading && !experimentsError && (

                /* NO EXPERIMENTS YET FOR THIS LAB */

                <div className="experiments-empty">

                  <div className="empty-icon">
                    🔬
                  </div>

                  <h3>
                    No Experiments Published Yet
                  </h3>

                  <p>
                    Experiments for this laboratory will appear
                    here once they are published by the administrator.
                  </p>

                </div>
              )

            )}

          </section>

        )}

      </main>

    </div>
  );
}

export default StudentDashboard;
