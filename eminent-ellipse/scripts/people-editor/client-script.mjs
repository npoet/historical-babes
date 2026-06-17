import { defaultInstagramUrl, defaultProfileImage, defaultSourceCredit } from "./config.mjs";
import { clientApiStatusScript } from "./client/api-status.mjs";
import { clientDraftActionsScript } from "./client/draft-actions.mjs";
import { clientFormStateScript } from "./client/form-state.mjs";
import { clientProfileListScript } from "./client/profile-list.mjs";
import { clientSourceSearchScript } from "./client/source-search.mjs";
import { clientTokenRepeaterScript } from "./client/token-repeaters.mjs";

export const editorClientScript = [
  clientApiStatusScript({ defaultInstagramUrl, defaultSourceCredit, defaultProfileImage }),
  clientTokenRepeaterScript,
  clientSourceSearchScript,
  clientFormStateScript,
  clientProfileListScript,
  clientDraftActionsScript,
].join("");
