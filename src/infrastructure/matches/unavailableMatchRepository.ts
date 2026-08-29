import type { MatchRepository } from "../../services";

export class UnavailableMatchRepository implements MatchRepository {
  private unavailable(): never {
    throw new Error(
      "Backend matches are unavailable. Check the public endpoint configuration.",
    );
  }

  async list() {
    return this.unavailable();
  }

  async get() {
    return this.unavailable();
  }

  async create() {
    return this.unavailable();
  }

  async update() {
    return this.unavailable();
  }

  async updateStatus() {
    return this.unavailable();
  }
}
