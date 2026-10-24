import VirtualGrid from './virtualization/VirtualGrid';
import CoreDemo from './core-demo/CoreDemo';

export function App() {
  return new URLSearchParams(window.location.search).get('demo') === 'core' ? (
    <CoreDemo />
  ) : (
    <VirtualGrid />
  );
}

export default App;
