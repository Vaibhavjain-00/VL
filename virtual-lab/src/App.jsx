import FunctionGenerator from "./pages/FunctionGenerator";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import StudentLogin from "./pages/studentlogin";
import StudentDashboard from "./pages/StudentDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Main website opens directly to Login */}
        <Route path="/" element={<StudentLogin />} />

        {/* Login page URL also works */}
        <Route path="/student-login" element={<StudentLogin />} />

        {/* Student Dashboard */}
        <Route
          path="/student-dashboard"
          element={<StudentDashboard />}
        />
        <Route
          path="/experiment/function-generator"
          element={<FunctionGenerator />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;