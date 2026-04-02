import { HashRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import EventDetail from './pages/EventDetail.jsx';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/event/:id" element={<EventDetail />} />
      </Routes>
    </HashRouter>
  );
}
