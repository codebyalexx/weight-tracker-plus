"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Menu, X, Flame, BarChart2, CalendarDays, LogOut, User as UserIcon, UserCircle } from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const user = session?.user;

  // Hide the menu on login/signup pages
  if (!isPending && !user) return null;

  const onLogout = async () => {
    await signOut();
    setIsOpen(false);
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="flex items-center justify-between p-4 bg-white border-b-2 border-gray-200 sticky top-0 z-50">
      <Link href="/" className="flex items-center gap-2">
        <Image src="/logo.svg" alt="Kcalm logo" width={30} height={30} className="object-contain" />
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
          {user && (
            <div className="flex items-center gap-3 p-4 border-b-2 border-gray-100 bg-gray-50">
              <div className="bg-main-blue text-white p-2 rounded-full">
                <UserIcon size={18} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm truncate">{user.name ?? user.email}</span>
                <span className="text-xs text-text-muted font-bold truncate">{user.email}</span>
              </div>
            </div>
          )}
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
            className="flex items-center gap-3 p-4 border-b-2 border-gray-100 hover:bg-gray-50 active:bg-gray-100"
          >
            <BarChart2 className="text-[#1cb0f6]" size={24} strokeWidth={2.5} />
            Insights
          </Link>
          <Link
            href="/profile"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-4 border-b-2 border-gray-100 hover:bg-gray-50 active:bg-gray-100"
          >
            <UserCircle className="text-[#58cc02]" size={24} strokeWidth={2.5} />
            Profil
          </Link>
          <button
            onClick={onLogout}
            className="flex items-center gap-3 p-4 hover:bg-gray-50 active:bg-gray-100 text-left"
          >
            <LogOut className="text-[#4B4B4B]" size={24} strokeWidth={2.5} />
            Déconnexion
          </button>
        </div>
      )}
    </header>
  );
}
