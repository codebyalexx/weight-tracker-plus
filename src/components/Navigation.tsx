"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X, Flame, BarChart2, CalendarDays } from "lucide-react";

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="flex items-center justify-between p-4 bg-white border-b-2 border-gray-200 sticky top-0 z-50">
      <Link href="/" className="flex items-center gap-2">
        <Flame className="text-[#58CC02]" size={30} strokeWidth={2.5} />
        <span className="text-xl font-bold text-[#4B4B4B] tracking-tight">Kcalm</span>
      </Link>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-[#AFAFAF] hover:text-[#4B4B4B] transition-colors"
        aria-label="Menu"
      >
        {isOpen ? <X size={28} strokeWidth={2.5} /> : <Menu size={28} strokeWidth={2.5} />}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 w-full bg-white border-b-2 border-gray-200 shadow-lg flex flex-col font-bold text-[#4B4B4B]">
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-4 border-b-2 border-gray-100 hover:bg-gray-50 active:bg-gray-100"
          >
            <Flame className="text-[#ff9600]" size={24} strokeWidth={2.5} />
            Tracking
          </Link>
          <Link
             href="/calendar"
             onClick={() => setIsOpen(false)}
             className="flex items-center gap-3 p-4 border-b-2 border-gray-100 hover:bg-gray-50 active:bg-gray-100"
          >
             <CalendarDays className="text-[#ea2b2b]" size={24} strokeWidth={2.5} />
             Calendrier
          </Link>
          <Link
            href="/insights"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-4 hover:bg-gray-50 active:bg-gray-100"
          >
            <BarChart2 className="text-[#1cb0f6]" size={24} strokeWidth={2.5} />
            Insights
          </Link>
        </div>
      )}
    </header>
  );
}
