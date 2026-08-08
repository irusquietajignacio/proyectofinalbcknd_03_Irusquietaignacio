import { randomUUID } from "node:crypto";

export class AdoptionRepository {
  constructor() {
    this.adoptions = [];
    this.users = new Set(["user-1", "user-2"]);
    this.pets = new Set(["pet-1", "pet-2", "pet-3"]);
  }

  async list() {
    return [...this.adoptions];
  }

  async findById(id) {
    return this.adoptions.find((adoption) => adoption.id === id) ?? null;
  }

  async create({ userId, petId }) {
    if (!this.users.has(userId)) {
      const error = new Error("User not found");
      error.code = "USER_NOT_FOUND";
      throw error;
    }

    if (!this.pets.has(petId)) {
      const error = new Error("Pet not found");
      error.code = "PET_NOT_FOUND";
      throw error;
    }

    if (
      this.adoptions.some(
        (adoption) => adoption.userId === userId && adoption.petId === petId,
      )
    ) {
      const error = new Error("Adoption already exists");
      error.code = "DUPLICATE_ADOPTION";
      throw error;
    }

    const adoption = {
      id: randomUUID(),
      userId,
      petId,
      createdAt: new Date().toISOString(),
    };
    this.adoptions.push(adoption);
    return adoption;
  }

  async removeByPair(userId, petId) {
    const index = this.adoptions.findIndex(
      (adoption) => adoption.userId === userId && adoption.petId === petId,
    );
    if (index === -1) return false;
    this.adoptions.splice(index, 1);
    return true;
  }
}
