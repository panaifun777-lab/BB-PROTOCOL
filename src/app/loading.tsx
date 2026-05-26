export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 animate-pulse" />
        <p className="text-slate-400 text-sm">加载中...</p>
      </div>
    </div>
  );
}
