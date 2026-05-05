import { ProductionErrorFlags } from "../systems/game_logic/resourceStructureSystem";
import _ from "lodash";

export const systemErrorFlagDictionary = Object.freeze({
  resourceStructure: ProductionErrorFlags,
});

export const hasSystemError = (flags, flag) => {
  return (flags & flag) !== 0;
};
