import { collection, query, where, getCountFromServer } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface HeroStats {
  members: number;
  publishedEvents: number;
  workshops: number;
  certificates: number;
  projectsCompleted: number;
  hackathonsWon: number;
}

const DEFAULT_STATS: HeroStats = {
  members: 150,
  publishedEvents: 12,
  workshops: 20,
  certificates: 85,
  projectsCompleted: 25,
  hackathonsWon: 8,
};

export const statsService = {
  async getMemberCount(): Promise<number> {
    const stats = await this.getHeroStats();
    return stats.members;
  },

  async getPublishedEventsCount(): Promise<number> {
    const stats = await this.getHeroStats();
    return stats.publishedEvents;
  },

  async getWorkshopCount(): Promise<number> {
    const stats = await this.getHeroStats();
    return stats.workshops;
  },

  async getCertificateCount(): Promise<number> {
    const stats = await this.getHeroStats();
    return stats.certificates;
  },

  async getProjectsCount(): Promise<number> {
    const stats = await this.getHeroStats();
    return stats.projectsCompleted;
  },

  async getHackathonsCount(): Promise<number> {
    const stats = await this.getHeroStats();
    return stats.hackathonsWon;
  },

  // Aggregate stats via public API to prevent 403 permission errors
  async getHeroStats(): Promise<HeroStats> {
    try {
      const res = await fetch("/api/public/stats");
      if (res.ok) {
        const data = await res.json();
        return {
          members: data.members || DEFAULT_STATS.members,
          publishedEvents: data.publishedEvents || DEFAULT_STATS.publishedEvents,
          workshops: data.workshops || DEFAULT_STATS.workshops,
          certificates: data.certificates || DEFAULT_STATS.certificates,
          projectsCompleted: data.projectsCompleted || DEFAULT_STATS.projectsCompleted,
          hackathonsWon: data.hackathonsWon || DEFAULT_STATS.hackathonsWon,
        };
      }
    } catch (_) {
      // Ignore network errors and fallback
    }
    return DEFAULT_STATS;
  }
};
