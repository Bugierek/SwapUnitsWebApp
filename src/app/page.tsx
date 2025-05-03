import { UnitConverter } from "@/components/unit-converter";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 lg:p-16 xl:p-24">
      <UnitConverter />
    </main>
  );
}
