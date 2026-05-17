import FloatingPet from "@/components/pet/FloatingPet";
import BottomNav from "@/components/ui/BottomNav";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-6xl font-black uppercase">
        KARMA
      </h1>

      <p className="mt-4 text-xl">
        Real Life Game Engine
      </p>

      <div className="mt-10 neo-card bg-lime-400 text-black p-6">
        <h2 className="text-3xl font-black">
          LIVE BOUNTY
        </h2>

        <p className="mt-3">
          Drink Mocca Tea @ Stockholm
        </p>

        <button className="mt-6 rounded-xl border-4 border-black bg-black px-6 py-3 font-black text-lime-400">
          CLAIM
        </button>
      </div>

      <FloatingPet />
      <BottomNav />
    </main>
  );
}
