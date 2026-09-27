import GameCanvas from '@/components/GameCanvas';

function App() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center overflow-hidden">
      <div className="w-full h-screen relative">
        <GameCanvas />
      </div>
    </div>
  );
}

export default App;
