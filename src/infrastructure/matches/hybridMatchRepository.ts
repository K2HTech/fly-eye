import type { MatchStatus } from "../../domain";
import {
  NoActiveSessionError,
  type CreateMatchInput,
  type MatchRepository,
  type UpdateMatchInput,
} from "../../services";
import type { ActiveSessionMode } from "../auth";

type ActiveModeReader = () => ActiveSessionMode | null;

/** Routes normal and anonymous-demo records to their separate ownership boundaries. */
export class HybridMatchRepository implements MatchRepository {
  constructor(
    private readonly normal: MatchRepository,
    private readonly demo: MatchRepository,
    private readonly activeMode: ActiveModeReader,
  ) {}

  private current(): MatchRepository {
    const mode = this.activeMode();
    if (mode === "backend") return this.normal;
    if (mode === "demo") return this.demo;
    throw new NoActiveSessionError();
  }

  async list() {
    return this.current().list();
  }

  async get(id: string) {
    return this.current().get(id);
  }

  async create(input: CreateMatchInput) {
    return this.current().create(input);
  }

  async update(id: string, input: UpdateMatchInput) {
    return this.current().update(id, input);
  }

  async updateStatus(id: string, status: MatchStatus) {
    return this.current().updateStatus(id, status);
  }
}
