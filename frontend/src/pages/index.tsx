import { Route, Routes } from 'react-router-dom';

import { MiniReddit } from './mini-reddit';
import { Profile } from './profile';

const routes = [
  { path: '/', Page: MiniReddit },
  { path: '/profile', Page: Profile },
];

function Routing() {
  const getRoutes = () => routes.map(({ path, Page }) => <Route key={path} path={path} element={<Page />} />);

  return <Routes>{getRoutes()}</Routes>;
}

export { Routing };
