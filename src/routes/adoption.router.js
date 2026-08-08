import { Router } from "express";

export function createAdoptionRouter({ repository }) {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const adoptions = await repository.list();
      res.status(200).json({ status: "success", payload: adoptions });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:aid", async (req, res, next) => {
    try {
      const adoption = await repository.findById(req.params.aid);
      if (!adoption) {
        return res
          .status(404)
          .json({ status: "error", error: "Adoption not found" });
      }
      return res.status(200).json({ status: "success", payload: adoption });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/:uid/:pid", async (req, res, next) => {
    try {
      const { uid, pid } = req.params;
      if (!uid || !pid) {
        return res
          .status(400)
          .json({ status: "error", error: "User and pet ids are required" });
      }

      const adoption = await repository.create({ userId: uid, petId: pid });
      return res.status(201).json({ status: "success", payload: adoption });
    } catch (error) {
      if (error.code === "USER_NOT_FOUND" || error.code === "PET_NOT_FOUND") {
        return res.status(404).json({ status: "error", error: error.message });
      }
      if (error.code === "DUPLICATE_ADOPTION") {
        return res.status(409).json({ status: "error", error: error.message });
      }
      return next(error);
    }
  });

  router.delete("/:uid/:pid", async (req, res, next) => {
    try {
      const removed = await repository.removeByPair(
        req.params.uid,
        req.params.pid,
      );
      if (!removed) {
        return res
          .status(404)
          .json({ status: "error", error: "Adoption not found" });
      }
      return res
        .status(200)
        .json({ status: "success", message: "Adoption removed" });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
