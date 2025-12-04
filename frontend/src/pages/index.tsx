import { Route, Routes } from 'react-router-dom';

import { MiniReddit } from './mini-reddit';

const routes = [{ path: '/', Page: MiniReddit }];

function Routing() {
  const getRoutes = () => routes.map(({ path, Page }) => <Route key={path} path={path} element={<Page />} />);

  return <Routes>{getRoutes()}</Routes>;
}

export { Routing };
