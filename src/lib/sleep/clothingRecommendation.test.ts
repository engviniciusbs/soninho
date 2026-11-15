import { describe, expect, it } from "vitest";
import {
  getClothingRecommendation,
  suggestSleepSackTOG,
  suggestSleepSackType,
} from "@/lib/sleep/clothingRecommendation";

describe("suggestSleepSackType", () => {
  it.each([
    [24, "mesh"],
    [23.9, "flannel"],
    [20, "flannel"],
    [19.9, "fleece"],
  ])("%d C -> %s", (temp, type) => {
    expect(suggestSleepSackType(temp)).toBe(type);
  });
});

describe("suggestSleepSackTOG", () => {
  it.each([
    [26, 0.5],
    [25.9, 1.0],
    [22, 1.0],
    [21.9, 2.0],
    [18, 2.0],
    [17.9, 3.0],
  ])("%d C -> TOG %d", (temp, tog) => {
    expect(suggestSleepSackTOG(temp)).toBe(tog);
  });
});

describe("getClothingRecommendation", () => {
  it("returns null without a temperature", () => {
    expect(getClothingRecommendation(null, null, null)).toBeNull();
  });

  it("16 C without sack warns and suggests a sack", () => {
    expect(getClothingRecommendation(16, null, null)).toEqual({
      sleepSack: "Sem saquinho",
      layers: "Roupa bem quente — considere usar um saquinho",
      warning: "Temperatura baixa: recomendamos usar um saquinho de dormir",
    });
  });

  it("22 C without sack", () => {
    expect(getClothingRecommendation(22, null, null)).toEqual({
      sleepSack: "Sem saquinho",
      layers: "Body manga longa",
      warning: undefined,
    });
  });

  it("28 C without sack", () => {
    expect(getClothingRecommendation(28, null, null)).toEqual({
      sleepSack: "Sem saquinho",
      layers: "Body manga curta ou só fralda",
      warning: undefined,
    });
  });

  it("uses the TOG table when a TOG is given", () => {
    expect(getClothingRecommendation(22, "mesh", 1)).toEqual({
      sleepSack: "Saquinho TOG 1",
      layers: "Body manga curta + camiseta de pijama",
      warning: undefined,
    });
  });

  it("falls back to the nearest TOG with a warning", () => {
    expect(getClothingRecommendation(28, null, 3)).toEqual({
      sleepSack: "Saquinho TOG 3",
      layers: "Body manga curta",
      warning: "Para TOG 3 nesta temperatura, use como referência TOG 1",
    });
  });

  it("uses the sack table by type", () => {
    expect(getClothingRecommendation(21, "flannel", null)).toEqual({
      sleepSack: "Saquinho flanelado",
      layers: "Body manga longa + calça",
      warning: undefined,
    });
  });

  it("warns when the temperature is outside the sack range", () => {
    expect(getClothingRecommendation(28, "fleece", null)).toEqual({
      sleepSack: "Saquinho soft/fleece",
      layers: "Body manga longa",
      warning: "Temperatura fora do intervalo recomendado para Saquinho soft/fleece",
    });
  });

  it("adds the heat warning above 30 C", () => {
    expect(getClothingRecommendation(31, null, null)?.warning).toBe(
      "Temperatura elevada — verifique se o bebê não está com calor"
    );
  });
});
