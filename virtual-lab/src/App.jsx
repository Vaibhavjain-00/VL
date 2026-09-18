import { BrowserRouter, Routes, Route } from "react-router-dom";

import StudentLogin from "./pages/studentlogin";
import StudentDashboard from "./pages/StudentDashboard";
import ExperimentLab from "./pages/ExperimentLab";

function App() {
  return (
    <BrowserRouter>

      <Routes>

        <Route
          path="/"
          element={<StudentLogin />}
        />

        <Route
          path="/student-login"
          element={<StudentLogin />}
        />

        <Route
          path="/student-dashboard"
          element={<StudentDashboard />}
        />

        <Route
          path="/experiment/function-generator"
          element={<ExperimentLab />}
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;