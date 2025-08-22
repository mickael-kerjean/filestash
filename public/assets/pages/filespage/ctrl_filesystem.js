import { createElement, createRender, onDestroy } from "../../lib/skeleton/index.js";
import { animate, slideYIn } from "../../lib/animate.js";
import rxjs, { effect, preventDefault } from "../../lib/rx.js";
import assert from "../../lib/assert.js";
import { loadCSS } from "../../helpers/loader.js";
import { qs } from "../../lib/dom.js";
import { ApplicationError } from "../../lib/error.js";
import { createLoader } from "../../components/loader.js";
import t from "../../locales/index.js";
import ctrlError from "../ctrl_error.js";

import { currentPath, sort, isMobile } from "./helper.js";
import { createThing } from "./thing.js";
import { clearSelection, addSelection, getSelection$, isSelected } from "./state_selection.js";
import { getState$ } from "./state_config.js";
import { ls, search } from "./model_files.js";
import { getPermission } from "./model_acl.js";

const ICONS = {
    EMPTY_FILES: "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE3MCIgdmlld0JveD0iMCAwIDMwMCAxNzAiIGZpbGw9Im5vbmUiPgogIDxwYXRoCiAgICAgZD0ibSA1Mi42Mjk5MDUsMTYwLjE2Nzg1IGMgMS41NDYsMCAyLjgsLTEuMjUzNiAyLjgsLTIuOCAwLC0xLjU0NjQgLTEuMjU0LC0yLjggLTIuOCwtMi44IC0xLjU0NywwIC0yLjgsMS4yNTM2IC0yLjgsMi44IDAsMS41NDY0IDEuMjUzLDIuOCAyLjgsMi44IHoiCiAgICAgZmlsbD0iIzkwOTA5MCIKICAgICBpZD0icGF0aDUwNjciCiAgICAgc3R5bGU9ImZpbGw6IzkwOTA5MDtmaWxsLW9wYWNpdHk6MC4xMzMzMzMiIC8+CiAgPHBhdGgKICAgICBkPSJtIDExMy4wMzAxOCwyMi4zOTM2NDkgYyAxLjU0NjQsMCAyLjgsLTEuMjUzNiAyLjgsLTIuOCAwLC0xLjU0NjQgLTEuMjUzNiwtMi44IC0yLjgsLTIuOCAtMS41NDY0LDAgLTIuOCwxLjI1MzYgLTIuOCwyLjggMCwxLjU0NjQgMS4yNTM2LDIuOCAyLjgsMi44IHoiCiAgICAgZmlsbD0iIzkwOTA5MCIKICAgICBpZD0icGF0aDUwNjkiCiAgICAgc3R5bGU9ImZpbGw6IzkwOTA5MDtmaWxsLW9wYWNpdHk6MC4xMzMzMzMiIC8+CiAgPHBhdGgKICAgICBkPSJtIDczLjI5MzU2NSwxMTIuNDYyMTYgYyAyLjg3MTg5LDAgNS4yMDAwMywtMi4zMjgxIDUuMjAwMDMsLTUuMiAwLC0yLjg3MTkgLTIuMzI4MTQsLTUuMiAtNS4yMDAwMywtNS4yIC0yLjg3MTg4LDAgLTUuMTk5OTk1LDIuMzI4MSAtNS4xOTk5OTUsNS4yIDAsMi44NzE5IDIuMzI4MTE1LDUuMiA1LjE5OTk5NSw1LjIgeiIKICAgICBmaWxsPSIjOTA5MDkwIgogICAgIGlkPSJwYXRoNTA3MSIKICAgICBzdHlsZT0iZmlsbDojOTA5MDkwO2ZpbGwtb3BhY2l0eTowLjEzMzMzMzM0IiAvPgogIDxkZWZzCiAgICAgaWQ9ImRlZnM1MTE3Ij4KICAgIDxmaWx0ZXIKICAgICAgIGlkPSJmaWx0ZXIwX2QiCiAgICAgICB4PSIxNi4wNzYyIgogICAgICAgeT0iMTIuOTU3NSIKICAgICAgIHdpZHRoPSIxMTQuOCIKICAgICAgIGhlaWdodD0iMTM0LjYwMDAxIgogICAgICAgZmlsdGVyVW5pdHM9InVzZXJTcGFjZU9uVXNlIgogICAgICAgY29sb3ItaW50ZXJwb2xhdGlvbi1maWx0ZXJzPSJzUkdCIj4KICAgICAgPGZlRmxvb2QKICAgICAgICAgZmxvb2Qtb3BhY2l0eT0iMCIKICAgICAgICAgcmVzdWx0PSJCYWNrZ3JvdW5kSW1hZ2VGaXgiCiAgICAgICAgIGlkPSJmZUZsb29kNTA5NyIgLz4KICAgICAgPGZlQ29sb3JNYXRyaXgKICAgICAgICAgaW49IlNvdXJjZUFscGhhIgogICAgICAgICB0eXBlPSJtYXRyaXgiCiAgICAgICAgIHZhbHVlcz0iMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMTI3IDAiCiAgICAgICAgIGlkPSJmZUNvbG9yTWF0cml4NTA5OSIgLz4KICAgICAgPGZlT2Zmc2V0CiAgICAgICAgIGR5PSIxMSIKICAgICAgICAgaWQ9ImZlT2Zmc2V0NTEwMSIgLz4KICAgICAgPGZlR2F1c3NpYW5CbHVyCiAgICAgICAgIHN0ZERldmlhdGlvbj0iMTEiCiAgICAgICAgIGlkPSJmZUdhdXNzaWFuQmx1cjUxMDMiIC8+CiAgICAgIDxmZUNvbG9yTWF0cml4CiAgICAgICAgIHR5cGU9Im1hdHJpeCIKICAgICAgICAgdmFsdWVzPSIwIDAgMCAwIDAuMzk3NzA4IDAgMCAwIDAgMC40Nzc0OSAwIDAgMCAwIDAuNTc1IDAgMCAwIDAuMjcgMCIKICAgICAgICAgaWQ9ImZlQ29sb3JNYXRyaXg1MTA1IiAvPgogICAgICA8ZmVCbGVuZAogICAgICAgICBtb2RlPSJub3JtYWwiCiAgICAgICAgIGluMj0iQmFja2dyb3VuZEltYWdlRml4IgogICAgICAgICByZXN1bHQ9ImVmZmVjdDFfZHJvcFNoYWRvdyIKICAgICAgICAgaWQ9ImZlQmxlbmQ1MTA3IiAvPgogICAgICA8ZmVCbGVuZAogICAgICAgICBtb2RlPSJub3JtYWwiCiAgICAgICAgIGluPSJTb3VyY2VHcmFwaGljIgogICAgICAgICBpbjI9ImVmZmVjdDFfZHJvcFNoYWRvdyIKICAgICAgICAgcmVzdWx0PSJzaGFwZSIKICAgICAgICAgaWQ9ImZlQmxlbmQ1MTA5IiAvPgogICAgPC9maWx0ZXI+CiAgICA8bGluZWFyR3JhZGllbnQKICAgICAgIGlkPSJwYWludDBfbGluZWFyIgogICAgICAgeDE9IjczLjQ1MzEwMiIKICAgICAgIHkxPSIyMS44NjE5IgogICAgICAgeDI9IjczLjQ1MzEwMiIKICAgICAgIHkyPSIxMTUuNTM0IgogICAgICAgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICA8c3RvcAogICAgICAgICBzdG9wLWNvbG9yPSIjRkRGRUZGIgogICAgICAgICBpZD0ic3RvcDUxMTIiIC8+CiAgICAgIDxzdG9wCiAgICAgICAgIG9mZnNldD0iMC45OTY0IgogICAgICAgICBzdG9wLWNvbG9yPSIjRUNGMEY1IgogICAgICAgICBpZD0ic3RvcDUxMTQiIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGZpbHRlcgogICAgICAgaWQ9ImZpbHRlcjBfZC03IgogICAgICAgeD0iMC4zOTExMTMwMSIKICAgICAgIHk9IjM1LjM5NDc5OCIKICAgICAgIHdpZHRoPSIxNDUuNTk1IgogICAgICAgaGVpZ2h0PSIxMDIuOCIKICAgICAgIGZpbHRlclVuaXRzPSJ1c2VyU3BhY2VPblVzZSIKICAgICAgIGNvbG9yLWludGVycG9sYXRpb24tZmlsdGVycz0ic1JHQiI+CiAgICAgIDxmZUZsb29kCiAgICAgICAgIGZsb29kLW9wYWNpdHk9IjAiCiAgICAgICAgIHJlc3VsdD0iQmFja2dyb3VuZEltYWdlRml4IgogICAgICAgICBpZD0iZmVGbG9vZDEyMjciIC8+CiAgICAgIDxmZUNvbG9yTWF0cml4CiAgICAgICAgIGluPSJTb3VyY2VBbHBoYSIKICAgICAgICAgdHlwZT0ibWF0cml4IgogICAgICAgICB2YWx1ZXM9IjAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDEyNyAwIgogICAgICAgICBpZD0iZmVDb2xvck1hdHJpeDEyMjkiIC8+CiAgICAgIDxmZU9mZnNldAogICAgICAgICBkeT0iMTEiCiAgICAgICAgIGlkPSJmZU9mZnNldDEyMzEiIC8+CiAgICAgIDxmZUdhdXNzaWFuQmx1cgogICAgICAgICBzdGREZXZpYXRpb249IjExIgogICAgICAgICBpZD0iZmVHYXVzc2lhbkJsdXIxMjMzIiAvPgogICAgICA8ZmVDb2xvck1hdHJpeAogICAgICAgICB0eXBlPSJtYXRyaXgiCiAgICAgICAgIHZhbHVlcz0iMCAwIDAgMCAwLjM5NzcwOCAwIDAgMCAwIDAuNDc3NDkgMCAwIDAgMCAwLjU3NSAwIDAgMCAwLjI3IDAiCiAgICAgICAgIGlkPSJmZUNvbG9yTWF0cml4MTIzNSIgLz4KICAgICAgPGZlQmxlbmQKICAgICAgICAgbW9kZT0ibm9ybWFsIgogICAgICAgICBpbjI9IkJhY2tncm91bmRJbWFnZUZpeCIKICAgICAgICAgcmVzdWx0PSJlZmZlY3QxX2Ryb3BTaGFkb3ciCiAgICAgICAgIGlkPSJmZUJsZW5kMTIzNyIgLz4KICAgICAgPGZlQmxlbmQKICAgICAgICAgbW9kZT0ibm9ybWFsIgogICAgICAgICBpbj0iU291cmNlR3JhcGhpYyIKICAgICAgICAgaW4yPSJlZmZlY3QxX2Ryb3BTaGFkb3ciCiAgICAgICAgIHJlc3VsdD0ic2hhcGUiCiAgICAgICAgIGlkPSJmZUJsZW5kMTIzOSIgLz4KICAgIDwvZmlsdGVyPgogIDwvZGVmcz4KICA8cGF0aAogICAgIGQ9Im0gMjEuMjIwODMyLDkyLjI2NDAxNiBoIC00LjkgYyAtMC4zLDAgLTAuNiwwLjEgLTAuNywwLjQgbCAtMi40LDQuMyBjIC0wLjEsMC4zIC0wLjEsMC42IDAsMC45IGwgMi40LDQuMzAwMDA0IGMgMC4xLDAuMyAwLjQsMC40IDAuNywwLjQgaCA0LjkgYyAwLjMsMCAwLjYsLTAuMSAwLjcsLTAuNCBsIDIuNCwtNC4zMDAwMDQgYyAwLjEsLTAuMyAwLjEsLTAuNiAwLC0wLjkgbCAtMi40LC00LjMgYyAtMC4xLC0wLjMgLTAuNCwtMC40IC0wLjcsLTAuNCB6IgogICAgIGlkPSJwYXRoNCIKICAgICBzdHlsZT0iZmlsbDojOTA5MDkwO2ZpbGwtb3BhY2l0eTowLjEzMzMzMyIgLz4KICA8cGF0aAogICAgIGNsYXNzPSJmaWxlIgogICAgIGQ9Im0gMjcxLjA5MjU5LDExLjY1MjMxMiAtNy4zNzAxOSwzLjU4MzkxOCBjIC0wLjc2MTk0LDAuNDMxMTE2IC0xLjcwNDkxLDAuNTgzNTAxIC0yLjU3MjQ2LDAuNjA1MjIyIC0wLjg2NzU0LDAuMDIxNzIgLTEuNzg3OTEsLTAuMTYxMjQ0IC0yLjYzMjg1LC0wLjQ3NDg2NyAtMS42MTQ0NCwtMC43NTc4OTggLTMuMDU1NCwtMi4xMTI0NDIgLTMuOTM4MTUsLTMuODQxNTA5IDAsMCAtMS41MDg5NiwtMy4zMTAwMzcyIC0zLjA3MDc1LC02LjgyNDc3NDUgbCAtMC4yMzM4OCwtMC40ODM0MzY4IC0xNS45NjI1Myw3LjUwNzQ2OTMgYyAtMi41NDIyMywxLjE0NTI3MSAtMy42MTMyOSw0LjE4NTE0NCAtMi41MTkyOCw2LjczMjk5OCBsIDExLjUyODU1LDI1LjY0NDA3NCBjIDEuMDk0MDIsMi41NDc4NTUgNC4wODksMy41ODAyMDUgNi42MzEyNSwyLjQzNDkzMSBsIDI1LjU5NTg0LC0xMi4wNDk0MDIgYyAyLjU0MjI0LC0xLjE0NTI3NSAzLjYxMzMxLC00LjE4NTE0MyAyLjUxOTMsLTYuNzMyOTk4IEwgMjcxLjcwMzY1LDExLjQ4MjQ5IFoiCiAgICAgc3R5bGU9ImNsaXAtcnVsZTpldmVub2RkO2ZpbGw6IzkwOTA5MDtmaWxsLW9wYWNpdHk6MC4xMzMzMzMzNDtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2Utd2lkdGg6MS40OTQ3MSIKICAgICBpZD0icGF0aDYiIC8+CiAgPHBhdGgKICAgICBjbGFzcz0iZmlsZSIKICAgICBkPSJtIDI1OS40MTQ2OCwxMi45MjMzNjggYyAtMS4xMDE0NCwtMC40NjE3MTMgLTEuOTc2NTksLTEuMzE1MzggLTIuNjI1NDMsLTIuNTYxMDA1IGwgLTAuMDUyOCwtMC4yMDQ3IC0wLjI4NjY4LC0wLjY4ODE0NzIgLTEuMDQxMTksLTIuMzQzMTU4IC0wLjU3MzQxLC0xLjM3NjI3NiAxMy4wMDU5OSw0LjcyMTc3MDIgLTUuMTU5OTMsMi40MjEyMDIgYyAtMC40ODI3NywwLjI0Mzg2NiAtMS4wMTg0MSwwLjI4MzAyOCAtMS41NTQwMSwwLjMyMjE5NiAtMC41MzU2NCwwLjAzOTE2IC0xLjEyNDA2LC0wLjEyNjM2NCAtMS43MTI0OSwtMC4yOTE4OTkgeiIKICAgICBzdHlsZT0iY2xpcC1ydWxlOmV2ZW5vZGQ7ZmlsbDojOTA5MDkwO2ZpbGwtb3BhY2l0eTowLjEzMzMzMzM0O2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZS13aWR0aDoxLjQ5NDcxIgogICAgIGlkPSJwYXRoOCIgLz4KICA8cGF0aAogICAgIGQ9Im0gMjMuOTQ0NDAzLDE3LjYzNTU2MyBjIC0yLjA3NzQxOSwxLjE5OTQxNSAtMi40NzQ2NjksMy44MzI3OTggLTEuMzAzNTc5LDUuODYxMjAyIGwgMTEuMTU3OTY5LDE5LjMyNjEzMyBjIDEuMjY4NjksMi4xOTc0MzUgMy41MzE5NiwyLjkxOTEzNSA1LjY2MjY0LDEuNjg4OTc1IGwgMjQuMzQzMTIsLTE0LjA1NDQ5MSBjIDEuMzg0OTYsLTAuNzk5NjEgMS45MjQxMSwtMy4wNjQxNjkgMC42MjI4OCwtNS4zMTc5MzkgTCA1NC45Mjg1NDMsOC42ODY4NjI3IGMgLTEuMDQwOTksLTEuODAzMDExIC0zLjA3NjU0LC0yLjEzMDMxMyAtNC40NjE0NiwtMS4zMzA3MzQgbCAtMTIuNTE3ODIsNy4yMjcxNjkzIC00Ljk0OTQ0LC0yLjE3NTg2OSB6IgogICAgIGlkPSJwYXRoMTYiCiAgICAgc3R5bGU9ImZpbGw6IzkwOTA5MDtmaWxsLW9wYWNpdHk6MC4xMzMzMzMzNDtzdHJva2Utd2lkdGg6MC42MzI1OTQiIC8+CiAgPGcKICAgICBpZD0iZzIwIgogICAgIHRyYW5zZm9ybT0idHJhbnNsYXRlKDI0My4yODEwNCwxMzEuMDczNDYpIgogICAgIHN0eWxlPSJmaWxsOiM5MDkwOTA7ZmlsbC1vcGFjaXR5OjAuMTMzMzMzMzQiPgogICAgPHBhdGgKICAgICAgIGQ9Im0gNDIuNCwyMy4yIDguNiw5LjkgYyAwLjMsMC4zIDAuMSwwLjggLTAuMywwLjkgTCAzOCwzNi4yIGMgLTAuNCwwLjEgLTAuNywtMC4zIC0wLjYsLTAuNyBsIDQuMSwtMTIuMSBjIDAuMSwtMC40IDAuNywtMC41IDAuOSwtMC4yIHoiCiAgICAgICBpZD0icGF0aDE4IgogICAgICAgc3R5bGU9ImZpbGw6IzkwOTA5MDtmaWxsLW9wYWNpdHk6MC4xMzMzMzMzNCIgLz4KICA8L2c+CiAgPHBhdGgKICAgICBkPSJtIDI4Ni4wODgzMiw4NS43MTYxIC0yLDEgYyAtMC4zLDAuMSAtMC42LDAgLTAuOCwtMC4zIGwgLTEsLTIgYyAtMC4xLC0wLjMgMCwtMC42IDAuMywtMC44IGwgMiwtMSBjIDAuMywtMC4xIDAuNiwwIDAuOCwwLjMgbCAxLDIgYyAwLjEsMC4zIDAsMC43IC0wLjMsMC44IHoiCiAgICAgaWQ9InBhdGgxMCIKICAgICBzdHlsZT0iZmlsbDojOTA5MDkwO2ZpbGwtb3BhY2l0eTowLjEzMzMzMyIgLz4KICA8cGF0aAogICAgIGQ9Im0gMTExLjM1ODEsNjcuODkzNDgzIGggNzIuMDk5NyBjIDIuOSwwIDUuMSwyLjIgNS4xLDUuMSB2IDQ1LjY5OTk5NyBjIDAsMi45IC0yLjIsNS4xIC01LjEsNS4xIGggLTcyLjA5OTcgYyAtMi45LDAgLTUuMSwtMi4yIC01LjEsLTUuMSBWIDcyLjk5MzQ4MyBjIDAsLTIuOSAyLjQsLTUuMSA1LjEsLTUuMSB6IgogICAgIGZpbGw9IiM5MDkwOTAiCiAgICAgaWQ9InBhdGgxMTk5IiAvPgogIDxnCiAgICAgZmlsdGVyPSJ1cmwoI2ZpbHRlcjBfZCkiCiAgICAgaWQ9ImcxMjAzIgogICAgIHN0eWxlPSJmaWx0ZXI6dXJsKCNmaWx0ZXIwX2QtNykiCiAgICAgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNzYuNDY2OCwzMS4xOTg2ODMpIj4KICAgIDxwYXRoCiAgICAgICBkPSJNIDExNy42OTEsNDYuNDk0OCBIIDg3LjI5MTEgYyAtMywwIC01LjgsMSAtOC4xLDIuOSBsIC04LDYuNSBjIC0yLjIsMS44IC01LjEsMi45IC04LjEsMi45IGggLTM0LjQgYyAtMy41LDAgLTYuMywyLjkgLTYuMyw2LjMgMCwwLjMgMCwwLjYgMC4xLDAuOSBsIDYuMywzMy43IGMgMC41LDMuMjAwMiAzLjIsNS41MDAyIDYuMyw1LjUwMDIgaCA3My41OTk5IGMgMy4yLDAgNS44LC0yLjIgNi4zLC01LjQwMDIgbCA4LjksLTQ2LjEgYyAwLjYsLTMuNSAtMS43LC02LjYgLTUuMiwtNy4zIC0wLjMsMC4xIC0wLjcsMC4xIC0xLDAuMSB6IgogICAgICAgZmlsbD0iI2ZmZmZmZiIKICAgICAgIGlkPSJwYXRoMTIwMSIgLz4KICA8L2c+CiAgPHBhdGgKICAgICBkPSJtIDEzNS4zNTgxLDExMi41OTM1OCBjIDEuOCwwIDMuMywtMS41IDMuMywtMy4zIDAsLTEuOCAtMS41LC0zLjMgLTMuMywtMy4zIC0xLjgsMCAtMy4zLDEuNSAtMy4zLDMuMyAwLDEuOCAxLjUsMy4zIDMuMywzLjMgeiIKICAgICBmaWxsPSIjOTA5MDkwIgogICAgIGlkPSJwYXRoMTIwNSIgLz4KICA8cGF0aAogICAgIGQ9Im0gMTYxLjA1ODEsMTEyLjQ5MzQ4IGMgMS44LDAgMy4zLC0xLjUgMy4zLC0zLjMgMCwtMS44IC0xLjUsLTMuMyAtMy4zLC0zLjMgLTEuOCwwIC0zLjMsMS41IC0zLjMsMy4zIDAsMS45IDEuNSwzLjMgMy4zLDMuMyB6IgogICAgIGZpbGw9IiM5MDkwOTAiCiAgICAgaWQ9InBhdGgxMjA3IiAvPgogIDxwYXRoCiAgICAgZD0ibSAxNDQuMTU4LDg4Ljg5MzQ4MSBjIC0zLjYsLTcgLTQuNCwtMTUuMzk5OTk4IC0yLC0yMi45OTk5OTggMi4zLC03LjYgNy44LC0xNC4xIDE0LjYsLTE3LjggMi4xLC0xLjEgNC41LC0yIDYuOSwtMi4xIDIuNCwtMC4xIDUsMC43IDYuNiwyLjcgMS42LDEuOCAxLjksNC44IDAuNiw2LjggLTEuNCwxLjkgLTQuMiwyLjcgLTYuNSwyLjEgLTMuNywtMC43IC02LjcsLTMuNiAtNy42LC03LjEgLTAuOSwtMy41IDAuMywtNy42IDMuMSwtOS45IDEuOCwtMS42IDQuMywtMi41IDYuNiwtMy4yIDExLjE5OTgsLTMuMyAyMy4zOTk4LC0zLjcgMzQuNzk5OCwtMS4yIgogICAgIHN0cm9rZT0iIzU3NTk1YSIKICAgICBzdHJva2Utd2lkdGg9IjIiCiAgICAgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIgogICAgIHN0cm9rZS1kYXNoYXJyYXk9IjQsIDQiCiAgICAgaWQ9InBhdGgxMjA5IiAvPgogIDxwYXRoCiAgICAgZD0ibSAxNTEuMzU4LDExNi4wOTM0OCBoIC02LjIgdiAxLjUgaCA2LjIgeiIKICAgICBmaWxsPSIjOTA5MDkwIgogICAgIGlkPSJwYXRoMTIxMSIgLz4KICA8cGF0aAogICAgIGQ9Im0gMjA3LjI1NzgsMzMuNTkzNDMzIGMgLTAuMSwxLjUgLTAuMiwyLjkgLTEuMywzLjIgLTEuMSwwLjMgLTEuNiwtMC43IC0yLjMsLTIuMSAtMC43LC0xLjMgLTAuMywtMi42OTk5OTYgMC45LC0yLjk5OTk5NiAxLjEsLTAuMyAyLjksMC4xIDIuNywxLjg5OTk5NiB6IgogICAgIGZpbGw9IiM5MDkwOTAiCiAgICAgaWQ9InBhdGgxMjEzIiAvPgogIDxwYXRoCiAgICAgZD0ibSAyMDYuMDU3OCw0MC43OTM0NTMgYyAwLjMsLTEuOCAwLjYsLTIuOCAtMC40LC0zLjMgLTEuMSwtMC41IC0xLjgsMC40IC0zLDEuNiAtMSwxLjEgLTAuNCwyLjcwMDAzIDAuNiwzLjIwMDAzIDEuMiwwLjYgMi41LDAgMi44LC0xLjUwMDAzIHoiCiAgICAgZmlsbD0iIzkwOTA5MCIKICAgICBpZD0icGF0aDEyMTUiIC8+CiAgPHBhdGgKICAgICBkPSJtIDIwNy40NTc4LDM3LjQ5MzUzMyBjIC0wLjEsMC43IC0wLjYsMS4yIC0xLjMsMS4zIC0wLjMsMCAtMC42LDAgLTEsMCAtMS40LC0wLjIgLTIuNSwtMS4xIC0yLjQsLTIgMC4xLC0wLjkgMS40LC0xLjQgMywtMS4yIDAuMywwIDAuNiwwLjEgMC44LDAuMiAwLjYsMC4yIDEsMC45IDAuOSwxLjcgMCwwIDAsLTAuMSAwLDAgeiIKICAgICBmaWxsPSIjNTc1OTVhIgogICAgIGlkPSJwYXRoMTIxNyIgLz4KICA8cGF0aAogICAgIGQ9Im0gOTUuODU3OSw2NS41OTM0ODMgYyAwLC0xLjcgMCwtMy40IDEuMiwtMy45IDEuMywtMC41IDIsMC43IDMsMi40IDAuOSwxLjUgMC41LDMuMSAtMC44LDMuNiAtMS4xLDAuNSAtMy40LDAuMiAtMy40LC0yLjEgeiIKICAgICBmaWxsPSIjOTA5MDkwIgogICAgIGlkPSJwYXRoMTIxOSIgLz4KICA8cGF0aAogICAgIGQ9Im0gOTYuNTU3OSw1Ny4xOTM1ODMgYyAtMC4yLDIuMSAtMC41LDMuMyAwLjgsMy44IDEuMywwLjUgMiwtMC42IDMuMywtMi4yIDEsLTEuNCAwLjMsLTMuMiAtMSwtMy43IC0xLjMsLTAuNSAtMi45LDAuNCAtMy4xLDIuMSB6IgogICAgIGZpbGw9IiM5MDkwOTAiCiAgICAgaWQ9InBhdGgxMjIxIiAvPgogIDxwYXRoCiAgICAgZD0ibSA5NS40NTgsNjEuMTkzNTgzIGMgMCwtMC44IDAuNiwtMS40IDEuMywtMS41IDAuMywtMC4xIDAuNywtMC4xIDEuMSwwIDEuNiwwLjEgMywxIDIuOSwyIC0wLjEsMSAtMS40LDEuNyAtMy4xLDEuNSAtMC4zLDAgLTAuNiwtMC4xIC0wLjksLTAuMiAtMC44LC0wLjEgLTEuMywtMC45IC0xLjMsLTEuOCB6IgogICAgIGZpbGw9IiM1NzU5NWEiCiAgICAgaWQ9InBhdGgxMjIzIiAvPgogIDxwYXRoCiAgICAgZD0ibSAxMDIuMjU4MSw2MS40OTM1ODMgYyAxMC41LDAgMjkuOSw2LjEgMzAuMiwyOC40OTk5OTgiCiAgICAgc3Ryb2tlPSIjNTc1OTVhIgogICAgIHN0cm9rZS13aWR0aD0iMiIKICAgICBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiCiAgICAgc3Ryb2tlLWRhc2hhcnJheT0iNCwgNCIKICAgICBpZD0icGF0aDEyMjUiIC8+CiAgPHBhdGgKICAgICBkPSJtIDE3NS4wNzg0MSw0LjE1ODgzOCBoIC0yLjk4ODA4IGMgLTAuMTgyOTQsMCAtMC4zNjU4OCwwLjA2NTAwMyAtMC40MjY4NywwLjI2MDAxMDIgbCAtMS40NjM1NCwyLjc5NTExMDEgYyAtMC4wNjEsMC4xOTUwMDcgLTAuMDYxLDAuMzkwMDE1IDAsMC41ODUwMjMgbCAxLjQ2MzU0LDIuNzk1MTEwNyBjIDAuMDYxLDAuMTk1MDA4IDAuMjQzOTMsMC4yNjAwMTEgMC40MjY4NywwLjI2MDAxMSBoIDIuOTg4MDggYyAwLjE4Mjk0LDAgMC4zNjU4OSwtMC4wNjUgMC40MjY4NywtMC4yNjAwMTEgbCAxLjQ2MzU1LC0yLjc5NTExMDcgYyAwLjA2MSwtMC4xOTUwMDggMC4wNjEsLTAuMzkwMDE2IDAsLTAuNTg1MDIzIGwgLTEuNDYzNTUsLTIuNzk1MTEwMSBjIC0wLjA2MSwtMC4xOTUwMDc2IC0wLjI0MzkzLC0wLjI2MDAxMDIgLTAuNDI2ODcsLTAuMjYwMDEwMiB6IgogICAgIGlkPSJwYXRoNC01IgogICAgIHN0eWxlPSJmaWxsOiM5MDkwOTA7ZmlsbC1vcGFjaXR5OjAuMTMzMzMzO3N0cm9rZS13aWR0aDowLjYyOTU5OCIgLz4KPC9zdmc+Cg==",
    EMPTY_SEARCH: "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE3MCIgdmlld0JveD0iMCAwIDMwMCAxNzAiIGZpbGw9Im5vbmUiPgogIDxwYXRoCiAgICAgZD0ibSAxODUuNzkzNjksNTguNTYxOTY0IGMgMi4yNjQsMCA0LjEsLTEuODM1NiA0LjEsLTQuMSAwLC0yLjI2NDQgLTEuODM2LC00LjEgLTQuMSwtNC4xIC0yLjI2NSwwIC00LjEsMS44MzU2IC00LjEsNC4xIDAsMi4yNjQ0IDEuODM1LDQuMSA0LjEsNC4xIHoiCiAgICAgZmlsbD0iIzkwOTA5MCIKICAgICBpZD0icGF0aDUwNjUiCiAgICAgc3R5bGU9ImZpbGw6IzkwOTA5MDtmaWxsLW9wYWNpdHk6MC4yIiAvPgogIDxwYXRoCiAgICAgZD0ibSAxOTEuNzkzNjksNDIuNTYyMDY0IGMgMS41NDYsMCAyLjgsLTEuMjUzNiAyLjgsLTIuOCAwLC0xLjU0NjQgLTEuMjU0LC0yLjggLTIuOCwtMi44IC0xLjU0NywwIC0yLjgsMS4yNTM2IC0yLjgsMi44IDAsMS41NDY0IDEuMjUzLDIuOCAyLjgsMi44IHoiCiAgICAgZmlsbD0iIzkwOTA5MCIKICAgICBpZD0icGF0aDUwNjciCiAgICAgc3R5bGU9ImZpbGw6IzkwOTA5MDtmaWxsLW9wYWNpdHk6MC4yIiAvPgogIDxwYXRoCiAgICAgZD0ibSA5MC4zOTM1OTUsNTguNDYxOTY0IGMgMS41NDY0LDAgMi44LC0xLjI1MzYgMi44LC0yLjggMCwtMS41NDY0IC0xLjI1MzYsLTIuOCAtMi44LC0yLjggLTEuNTQ2NCwwIC0yLjgsMS4yNTM2IC0yLjgsMi44IDAsMS41NDY0IDEuMjUzNiwyLjggMi44LDIuOCB6IgogICAgIGZpbGw9IiM5MDkwOTAiCiAgICAgaWQ9InBhdGg1MDY5IgogICAgIHN0eWxlPSJmaWxsOiM5MDkwOTA7ZmlsbC1vcGFjaXR5OjAuMiIgLz4KICA8cGF0aAogICAgIGQ9Im0gNzMuMjkzNTY1LDExMi40NjIxNiBjIDIuODcxODksMCA1LjIwMDAzLC0yLjMyODEgNS4yMDAwMywtNS4yIDAsLTIuODcxOSAtMi4zMjgxNCwtNS4yIC01LjIwMDAzLC01LjIgLTIuODcxODgsMCAtNS4xOTk5OTUsMi4zMjgxIC01LjE5OTk5NSw1LjIgMCwyLjg3MTkgMi4zMjgxMTUsNS4yIDUuMTk5OTk1LDUuMiB6IgogICAgIGZpbGw9IiM5MDkwOTAiCiAgICAgaWQ9InBhdGg1MDcxIgogICAgIHN0eWxlPSJmaWxsOiM5MDkwOTA7ZmlsbC1vcGFjaXR5OjAuMiIgLz4KICA8ZwogICAgIGZpbHRlcj0idXJsKCNmaWx0ZXIwX2QpIgogICAgIGlkPSJnNTA3NSIKICAgICB0cmFuc2Zvcm09InRyYW5zbGF0ZSg2Ny41NDY2OTUsMjIuMzE1NTY0KSI+CiAgICA8cGF0aAogICAgICAgZD0ibSAxMDguMDc2LDQ2LjI1NzUgMC44LDY0LjQwMDUgYyAwLDIuMiAtMS44LDMuOSAtNCwzLjkgSCA0Mi4wNzYyIGMgLTIuMiwwIC00LC0xLjggLTQsLTMuOSBWIDI3Ljg1NzUgYyAwLC0yLjIgMS44LC0zLjkgNCwtMy45IGggNDUuNSB6IgogICAgICAgZmlsbD0iI2ZmZmZmZiIKICAgICAgIGlkPSJwYXRoNTA3MyIgLz4KICA8L2c+CiAgPHBhdGgKICAgICBkPSJtIDEzOC4zMjI3OSw1OS43NzI5NjQgaCAtMjIuMSBjIC0wLjcsMCAtMS4zLC0wLjYgLTEuMywtMS4zIDAsLTAuNyAwLjYsLTEuMyAxLjMsLTEuMyBoIDIyLjEgYyAwLjcsMCAxLjMsMC42IDEuMywxLjMgMCwwLjcgLTAuNiwxLjMgLTEuMywxLjMgeiIKICAgICBmaWxsPSIjZjJmM2Y1IgogICAgIGlkPSJwYXRoNTA3NyIKICAgICBzdHlsZT0iZmlsbDojZjJmM2Y1O2ZpbGwtb3BhY2l0eToxIiAvPgogIDxwYXRoCiAgICAgZD0ibSAxMjcuODIyNzksNjYuOTczMTY0IGggLTExLjYgYyAtMC43LDAgLTEuMywtMC42IC0xLjMsLTEuMyAwLC0wLjcgMC42LC0xLjMgMS4zLC0xLjMgaCAxMS41IGMgMC43LDAgMS4zLDAuNiAxLjMsMS4zIDAsMC43IC0wLjYsMS4zIC0xLjIsMS4zIHoiCiAgICAgZmlsbD0iI2YyZjNmNSIKICAgICBpZD0icGF0aDUwNzkiIC8+CiAgPHBhdGgKICAgICBkPSJtIDE1NS4xMjI4OSw0Ni4yNzMwNjQgdiAxNy44IGMgMCwyLjUgMi4yLDQuNSA0LjcsNC41IGggMTUuNzk5OCIKICAgICBmaWxsPSIjZjJmM2Y1IgogICAgIGlkPSJwYXRoNTA4MSIgLz4KICA8cGF0aAogICAgIGQ9Im0gMTI0Ljg1NjA5LDU5LjUzODI2NCA0Ljc1MTYsLTE2Ljc2IDE5LjUxNjYsMi4yNDggLTYuODEzOSwxMC45MjI0IDUuMjc3OCw0LjIxNjcgLTExLjM2MjgsMjQuODUzNyAwLjYzMzEsLTE5LjI0MTYgeiIKICAgICBmaWxsPSJ2YXIoLS1iZy1jb2xvcl8iCiAgICAgaWQ9InBhdGg1MDgzIiAvPgogIDxkZWZzCiAgICAgaWQ9ImRlZnM1MTE3Ij4KICAgIDxmaWx0ZXIKICAgICAgIGlkPSJmaWx0ZXIwX2QiCiAgICAgICB4PSIxNi4wNzYyIgogICAgICAgeT0iMTIuOTU3NSIKICAgICAgIHdpZHRoPSIxMTQuOCIKICAgICAgIGhlaWdodD0iMTM0LjYwMDAxIgogICAgICAgZmlsdGVyVW5pdHM9InVzZXJTcGFjZU9uVXNlIgogICAgICAgY29sb3ItaW50ZXJwb2xhdGlvbi1maWx0ZXJzPSJzUkdCIj4KICAgICAgPGZlRmxvb2QKICAgICAgICAgZmxvb2Qtb3BhY2l0eT0iMCIKICAgICAgICAgcmVzdWx0PSJCYWNrZ3JvdW5kSW1hZ2VGaXgiCiAgICAgICAgIGlkPSJmZUZsb29kNTA5NyIgLz4KICAgICAgPGZlQ29sb3JNYXRyaXgKICAgICAgICAgaW49IlNvdXJjZUFscGhhIgogICAgICAgICB0eXBlPSJtYXRyaXgiCiAgICAgICAgIHZhbHVlcz0iMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMTI3IDAiCiAgICAgICAgIGlkPSJmZUNvbG9yTWF0cml4NTA5OSIgLz4KICAgICAgPGZlT2Zmc2V0CiAgICAgICAgIGR5PSIxMSIKICAgICAgICAgaWQ9ImZlT2Zmc2V0NTEwMSIgLz4KICAgICAgPGZlR2F1c3NpYW5CbHVyCiAgICAgICAgIHN0ZERldmlhdGlvbj0iMTEiCiAgICAgICAgIGlkPSJmZUdhdXNzaWFuQmx1cjUxMDMiIC8+CiAgICAgIDxmZUNvbG9yTWF0cml4CiAgICAgICAgIHR5cGU9Im1hdHJpeCIKICAgICAgICAgdmFsdWVzPSIwIDAgMCAwIDAuMzk3NzA4IDAgMCAwIDAgMC40Nzc0OSAwIDAgMCAwIDAuNTc1IDAgMCAwIDAuMjcgMCIKICAgICAgICAgaWQ9ImZlQ29sb3JNYXRyaXg1MTA1IiAvPgogICAgICA8ZmVCbGVuZAogICAgICAgICBtb2RlPSJub3JtYWwiCiAgICAgICAgIGluMj0iQmFja2dyb3VuZEltYWdlRml4IgogICAgICAgICByZXN1bHQ9ImVmZmVjdDFfZHJvcFNoYWRvdyIKICAgICAgICAgaWQ9ImZlQmxlbmQ1MTA3IiAvPgogICAgICA8ZmVCbGVuZAogICAgICAgICBtb2RlPSJub3JtYWwiCiAgICAgICAgIGluPSJTb3VyY2VHcmFwaGljIgogICAgICAgICBpbjI9ImVmZmVjdDFfZHJvcFNoYWRvdyIKICAgICAgICAgcmVzdWx0PSJzaGFwZSIKICAgICAgICAgaWQ9ImZlQmxlbmQ1MTA5IiAvPgogICAgPC9maWx0ZXI+CiAgICA8bGluZWFyR3JhZGllbnQKICAgICAgIGlkPSJwYWludDBfbGluZWFyIgogICAgICAgeDE9IjczLjQ1MzEwMiIKICAgICAgIHkxPSIyMS44NjE5IgogICAgICAgeDI9IjczLjQ1MzEwMiIKICAgICAgIHkyPSIxMTUuNTM0IgogICAgICAgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICA8c3RvcAogICAgICAgICBzdG9wLWNvbG9yPSIjRkRGRUZGIgogICAgICAgICBpZD0ic3RvcDUxMTIiIC8+CiAgICAgIDxzdG9wCiAgICAgICAgIG9mZnNldD0iMC45OTY0IgogICAgICAgICBzdG9wLWNvbG9yPSIjRUNGMEY1IgogICAgICAgICBpZD0ic3RvcDUxMTQiIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8cGF0aAogICAgIGQ9Im0gMTgwLjE4MzM3LDE0My4xNTA0NiBjIC0xLDAgLTIsLTAuNCAtMi44LC0xLjMgbCAtMTYuNjk5NiwtMTYuNzAwMyAtMC42LDAuNCBjIC01LjQsNCAtMTEuNyw2LjEgLTE4LjEsNi4xIC03LjcsMCAtMTUuNCwtMy4xIC0yMS4xLC04LjUgLTUuOTk5OTksLTUuNjk5OTkgLTkuMjk5OTksLTEzLjM5OTk5IC05LjI5OTk5LC0yMS43OTk5OSAwLC0xNi43MDAwMDMgMTMuNTk5OTksLTMwLjMwMDAwMyAzMC4yOTk5OSwtMzAuMzAwMDAzIDExLjQsMCAyMS40LDYgMjYuOCwxNi4yIDUuMjk5NiwxMC4xIDQuNTk5NiwyMS45MDAwMDMgLTEuOSwzMS40MDAwMDMgbCAtMC40LDAuNiAxNi43OTk2LDE2Ljc5OTk5IGMgMS43LDEuNyAxLjMsMy40MDAzIDEsNC4zMDAzIC0wLjgsMS42IC0yLjQsMi44IC00LDIuOCB6IG0gLTM4LjI5OTYsLTYzLjgwMDI5MyBjIC0xMi4yLDAgLTIxLjk5OTk5LDkuOSAtMjEuOTk5OTksMjIuMDAwMDAzIDAsMTMuOCAxMS4yOTk5OSwyMi4wOTk5OSAyMi4yOTk5OSwyMi4wOTk5OSA2LjcsMCAxMi44LC0yLjk5OTk5IDE3LjEsLTguMzk5OTkgNS4zLC02LjYgNi4yLC0xNS41MDAwMDMgMi41LC0yMy4yMDAwMDMgLTMuOCwtNy43IC0xMS40LC0xMi41IC0xOS45LC0xMi41IHoiCiAgICAgZmlsbD0iIzU3NTk1YSIKICAgICBpZD0icGF0aDQ1MjMiIC8+CiAgPHBhdGgKICAgICBkPSJtIDEzMi4zODM3NywxMDQuOTUwMjcgYyAxLjMsMCAyLjQsLTEuMSAyLjQsLTIuNCAwLC0xLjMgLTEuMSwtMi40IC0yLjQsLTIuNCAtMS4zLDAgLTIuNCwxLjEgLTIuNCwyLjQgMCwxLjMgMS4xLDIuNCAyLjQsMi40IHoiCiAgICAgZmlsbD0iIzkwOTA5MCIKICAgICBpZD0icGF0aDQ1MjUiIC8+CiAgPHBhdGgKICAgICBkPSJtIDE1MC43ODM3NywxMDQuOTUwMjcgYyAxLjMsMCAyLjQsLTEuMSAyLjQsLTIuNCAwLC0xLjMgLTEuMSwtMi40IC0yLjQsLTIuNCAtMS4zLDAgLTIuNCwxLjEgLTIuNCwyLjQgMCwxLjQgMS4xLDIuNCAyLjQsMi40IHoiCiAgICAgZmlsbD0iIzkwOTA5MCIKICAgICBpZD0icGF0aDQ1MjciIC8+CiAgPHBhdGgKICAgICBkPSJtIDEzMi4yODk5Nyw5NC42MTAwNjcgLTUuMjc5NSwyLjg1MDUgMC43MTI3LDEuMzE5OSA1LjI3OTQsLTIuODUwNiB6IgogICAgIGZpbGw9IiM5MDkwOTAiCiAgICAgaWQ9InBhdGg0NTI5IiAvPgogIDxwYXRoCiAgICAgZD0ibSAxNTAuNDU3MzcsOTQuNTcyMjY3IC0wLjcxMjUsMS4zMiA1LjI4LDIuODUgMC43MTI1LC0xLjMyIHoiCiAgICAgZmlsbD0iIzkwOTA5MCIKICAgICBpZD0icGF0aDQ1MzEiIC8+CiAgPHBhdGgKICAgICBkPSJtIDE0MS41ODM2NywxMTAuNTUwMjcgYyAxLjU0NjQsMCAyLjgsLTAuOTQwMiAyLjgsLTIuMSAwLC0xLjE1OTggLTEuMjUzNiwtMi4xIC0yLjgsLTIuMSAtMS41NDY0LDAgLTIuOCwwLjk0MDIgLTIuOCwyLjEgMCwxLjE1OTggMS4yNTM2LDIuMSAyLjgsMi4xIHoiCiAgICAgZmlsbD0iIzkwOTA5MCIKICAgICBpZD0icGF0aDQ1MzMiIC8+CiAgPHBhdGgKICAgICBkPSJNIDEyLjA4MjE1NCwxNDEuNTQ0MDggSCA3LjE4MjE1NDQgYyAtMC4zLDAgLTAuNiwwLjEgLTAuNywwLjQgbCAtMi40LDQuMyBjIC0wLjEsMC4zIC0wLjEsMC42IDAsMC45IGwgMi40LDQuMyBjIDAuMSwwLjMgMC40LDAuNCAwLjcsMC40IGggNC44OTk5OTk2IGMgMC4zLDAgMC42LC0wLjEgMC43LC0wLjQgbCAyLjQsLTQuMyBjIDAuMSwtMC4zIDAuMSwtMC42IDAsLTAuOSBsIC0yLjQsLTQuMyBjIC0wLjEsLTAuMyAtMC40LC0wLjQgLTAuNywtMC40IHoiCiAgICAgaWQ9InBhdGg0IgogICAgIHN0eWxlPSJmaWxsOiM5MDkwOTA7ZmlsbC1vcGFjaXR5OjAuMiIgLz4KICA8cGF0aAogICAgIGNsYXNzPSJmaWxlIgogICAgIGQ9Im0gMjcxLjA5MjU5LDExLjY1MjMxMiAtNy4zNzAxOSwzLjU4MzkxOCBjIC0wLjc2MTk0LDAuNDMxMTE2IC0xLjcwNDkxLDAuNTgzNTAxIC0yLjU3MjQ2LDAuNjA1MjIyIC0wLjg2NzU0LDAuMDIxNzIgLTEuNzg3OTEsLTAuMTYxMjQ0IC0yLjYzMjg1LC0wLjQ3NDg2NyAtMS42MTQ0NCwtMC43NTc4OTggLTMuMDU1NCwtMi4xMTI0NDIgLTMuOTM4MTUsLTMuODQxNTA5IDAsMCAtMS41MDg5NiwtMy4zMTAwMzcyIC0zLjA3MDc1LC02LjgyNDc3NDUgbCAtMC4yMzM4OCwtMC40ODM0MzY4IC0xNS45NjI1Myw3LjUwNzQ2OTMgYyAtMi41NDIyMywxLjE0NTI3MSAtMy42MTMyOSw0LjE4NTE0NCAtMi41MTkyOCw2LjczMjk5OCBsIDExLjUyODU1LDI1LjY0NDA3NCBjIDEuMDk0MDIsMi41NDc4NTUgNC4wODksMy41ODAyMDUgNi42MzEyNSwyLjQzNDkzMSBsIDI1LjU5NTg0LC0xMi4wNDk0MDIgYyAyLjU0MjI0LC0xLjE0NTI3NSAzLjYxMzMxLC00LjE4NTE0MyAyLjUxOTMsLTYuNzMyOTk4IEwgMjcxLjcwMzY1LDExLjQ4MjQ5IFoiCiAgICAgc3R5bGU9ImNsaXAtcnVsZTpldmVub2RkO2ZpbGw6IzkwOTA5MDtmaWxsLW9wYWNpdHk6MC4yO2ZpbGwtcnVsZTpldmVub2RkO3N0cm9rZS13aWR0aDoxLjQ5NDcxIgogICAgIGlkPSJwYXRoNiIgLz4KICA8cGF0aAogICAgIGNsYXNzPSJmaWxlIgogICAgIGQ9Im0gMjU5LjQxNDY4LDEyLjkyMzM2OCBjIC0xLjEwMTQ0LC0wLjQ2MTcxMyAtMS45NzY1OSwtMS4zMTUzOCAtMi42MjU0MywtMi41NjEwMDUgbCAtMC4wNTI4LC0wLjIwNDcgLTAuMjg2NjgsLTAuNjg4MTQ3MiAtMS4wNDExOSwtMi4zNDMxNTggLTAuNTczNDEsLTEuMzc2Mjc2IDEzLjAwNTk5LDQuNzIxNzcwMiAtNS4xNTk5MywyLjQyMTIwMiBjIC0wLjQ4Mjc3LDAuMjQzODY2IC0xLjAxODQxLDAuMjgzMDI4IC0xLjU1NDAxLDAuMzIyMTk2IC0wLjUzNTY0LDAuMDM5MTYgLTEuMTI0MDYsLTAuMTI2MzY0IC0xLjcxMjQ5LC0wLjI5MTg5OSB6IgogICAgIHN0eWxlPSJjbGlwLXJ1bGU6ZXZlbm9kZDtmaWxsOiM5MDkwOTA7ZmlsbC1vcGFjaXR5OjAuMjtmaWxsLXJ1bGU6ZXZlbm9kZDtzdHJva2Utd2lkdGg6MS40OTQ3MSIKICAgICBpZD0icGF0aDgiIC8+CiAgPHBhdGgKICAgICBkPSJtIDIzLjk0NDQwMywxNy42MzU1NjMgYyAtMi4wNzc0MTksMS4xOTk0MTUgLTIuNDc0NjY5LDMuODMyNzk4IC0xLjMwMzU3OSw1Ljg2MTIwMiBsIDExLjE1Nzk2OSwxOS4zMjYxMzMgYyAxLjI2ODY5LDIuMTk3NDM1IDMuNTMxOTYsMi45MTkxMzUgNS42NjI2NCwxLjY4ODk3NSBsIDI0LjM0MzEyLC0xNC4wNTQ0OTEgYyAxLjM4NDk2LC0wLjc5OTYxIDEuOTI0MTEsLTMuMDY0MTY5IDAuNjIyODgsLTUuMzE3OTM5IEwgNTQuOTI4NTQzLDguNjg2ODYyNyBjIC0xLjA0MDk5LC0xLjgwMzAxMSAtMy4wNzY1NCwtMi4xMzAzMTMgLTQuNDYxNDYsLTEuMzMwNzM0IGwgLTEyLjUxNzgyLDcuMjI3MTY5MyAtNC45NDk0NCwtMi4xNzU4NjkgeiIKICAgICBpZD0icGF0aDE2IgogICAgIHN0eWxlPSJmaWxsOiM5MDkwOTA7ZmlsbC1vcGFjaXR5OjAuMjtzdHJva2Utd2lkdGg6MC42MzI1OTQiIC8+CiAgPGcKICAgICBpZD0iZzIwIgogICAgIHRyYW5zZm9ybT0idHJhbnNsYXRlKDI0My4yODEwNCwxMzEuMDczNDYpIgogICAgIHN0eWxlPSJmaWxsOiM5MDkwOTA7ZmlsbC1vcGFjaXR5OjAuMiI+CiAgICA8cGF0aAogICAgICAgZD0ibSA0Mi40LDIzLjIgOC42LDkuOSBjIDAuMywwLjMgMC4xLDAuOCAtMC4zLDAuOSBMIDM4LDM2LjIgYyAtMC40LDAuMSAtMC43LC0wLjMgLTAuNiwtMC43IGwgNC4xLC0xMi4xIGMgMC4xLC0wLjQgMC43LC0wLjUgMC45LC0wLjIgeiIKICAgICAgIGlkPSJwYXRoMTgiCiAgICAgICBzdHlsZT0iZmlsbDojOTA5MDkwO2ZpbGwtb3BhY2l0eTowLjIiIC8+CiAgPC9nPgogIDxwYXRoCiAgICAgZD0ibSAyMjMuMDczMyw5Mi4zNzMwMzEgLTIsMSBjIC0wLjMsMC4xIC0wLjYsMCAtMC44LC0wLjMgbCAtMSwtMiBjIC0wLjEsLTAuMyAwLC0wLjYgMC4zLC0wLjggbCAyLC0xIGMgMC4zLC0wLjEgMC42LDAgMC44LDAuMyBsIDEsMiBjIDAuMSwwLjMgMCwwLjcgLTAuMywwLjggeiIKICAgICBpZD0icGF0aDEwIgogICAgIHN0eWxlPSJmaWxsOiM5MDkwOTA7ZmlsbC1vcGFjaXR5OjAuMiIgLz4KPC9zdmc+Cg==",
};

const VIRTUAL_SCROLL_MINIMUM_TRIGGER = 100;

export const files$ = new rxjs.BehaviorSubject(null);

export default async function(render) {
    const $page = createElement(`
        <div class="component_filesystem container">
            <div data-target="dragselect" style="display:none;"></div>
            <div data-target="header" style="text-align:center;"></div>

            <div class="ifscroll-before"></div>
            <div data-target="list" class="list"></div>
            <div class="ifscroll-after"></div>
            <br>
        </div>
    `);
    render($page);
    onDestroy(() => files$.next(null));

    // feature: virtual scrolling
    const path = currentPath();
    const $header = qs($page, `[data-target="header"]`);
    const $list = qs($page, `[data-target="list"]`);
    const removeLoader = createLoader($header);
    const $listBefore = qs($page, ".ifscroll-before");
    const $listAfter = qs($page, ".ifscroll-after");
    const refreshScreen$ = rxjs.merge(
        // case1: trigger the first display
        rxjs.of(null),
        // case2: height change => redraw screen
        rxjs.fromEvent(window, "resize").pipe( // height change = always redraw
            rxjs.startWith(null),
            rxjs.map(() => document.body.clientHeight),
            rxjs.distinctUntilChanged(),
            rxjs.skip(1),
        ),
        // case3: width change => redraw if grid size change
        rxjs.fromEvent(window, "resize").pipe(
            rxjs.startWith(null),
            rxjs.map(() => {
                if ($list.getAttribute("data-type") === "grid") {
                    return gridSize($list.clientWidth, document.body.clientWidth);
                }
                return 0;
            }),
            rxjs.distinctUntilChanged(),
            rxjs.skip(1),
        ),
    );

    let count = 0;
    effect(ls(path).pipe(
        rxjs.switchMap(({ files, ...rest }) => getState$().pipe(rxjs.switchMap((state) => {
            $header.innerHTML = "";
            $list.innerHTML = "";
            if (state.search) {
                const removeLoader = createLoader($header);
                $listBefore.setAttribute("style", "");
                $listAfter.setAttribute("style", "");
                return rxjs.timer(state.search ? 450 : 0).pipe(
                    rxjs.switchMap(() => search(state.search).pipe(
                        rxjs.map(({ files }) => ({
                            files, ...state, ...rest,
                        })),
                    )),
                    rxjs.finalize(() => effect(rxjs.of(null).pipe(removeLoader))),
                );
            }
            return rxjs.of({ files, ...state, ...rest });
        }))),
        rxjs.mergeMap((obj) => getPermission(path).pipe(
            rxjs.map((permissions) => ({ ...obj, permissions })),
        )),
        rxjs.mergeMap(({ show_hidden, files, ...rest }) => {
            if (show_hidden === false) files = files.filter(({ name }) => name[0] !== ".");
            files = sort(files, rest["sort"], rest["order"]);
            return rxjs.of({ ...rest, files });
        }),
        rxjs.map((data) => ({ ...data, count: count++ })),
        removeLoader,
        rxjs.mergeMap(({ files, search, ...rest }) => {
            files$.next(files);
            if (files.length === 0) {
                renderEmpty(createRender(qs($page, `[data-target="header"]`)), search ? ICONS.EMPTY_SEARCH : ICONS.EMPTY_FILES);
                return rxjs.EMPTY;
            }
            return rxjs.of({ ...rest, files, search });
        }),
        rxjs.mergeMap((obj) => refreshScreen$.pipe(rxjs.mapTo(obj))),
        rxjs.mergeMap(({ files, view, search, count, permissions }) => { // STEP1: setup the list of files
            $list.closest(".scroll-y").scrollTop = 0;
            let FILE_HEIGHT, COLUMN_PER_ROW;
            switch (view) {
            case "grid":
                FILE_HEIGHT = 160;
                COLUMN_PER_ROW = gridSize($list.clientWidth, document.body.clientWidth);
                $list.style.gridTemplateColumns = `repeat(${COLUMN_PER_ROW}, 1fr)`;
                $list.setAttribute("data-type", "grid");
                break;
            case "list":
                FILE_HEIGHT = 47;
                COLUMN_PER_ROW = 1;
                $list.style.gridTemplateColumns = `repeat(1, 1fr)`;
                $list.setAttribute("data-type", "list");
                break;
            default:
                throw new Error("Not Implemented");
            }
            const BLOCK_SIZE = Math.ceil(document.body.clientHeight / FILE_HEIGHT) + 1;

            let size = files.length;
            if (size > VIRTUAL_SCROLL_MINIMUM_TRIGGER) {
                size = Math.min(files.length, BLOCK_SIZE * COLUMN_PER_ROW);
            }
            const $fs = document.createDocumentFragment();
            for (let i = 0; i < size; i++) {
                const file = files[i];
                $fs.appendChild(createThing({
                    ...file,
                    ...createLink(file, currentPath()),
                    view,
                    search,
                    n: i,
                    permissions,
                }));
            }
            if (count === 0) animate(
                $list,
                { time: 200, keyframes: slideYIn(isMobile ? 10 : 5) },
            );
            $list.replaceChildren($fs);

            /// ///////////////////////////////////
            // CASE 1: virtual scroll isn't enabled
            if (files.length <= VIRTUAL_SCROLL_MINIMUM_TRIGGER) {
                return rxjs.of({ virtual: false });
            }

            /// ///////////////////////////////////
            // CASE 2: with virtual scroll
            const height = (Math.ceil(files.length / COLUMN_PER_ROW) - BLOCK_SIZE) * FILE_HEIGHT;
            if (height > 33554400) {
                console.log(`maximum CSS height reached, requested height ${height} is too large`);
            }
            const setHeight = (size) => {
                if (size < 0 || size > height) throw new ApplicationError(
                    "INTERNAL ERROR",
                    `assertion on size failed: size[${size}] height[${height}]`
                );
                $listBefore.style.height = `${size}px`;
                $listAfter.style.height = `${height - size}px`;
            };
            setHeight(0);
            const top = ($node) => $node.getBoundingClientRect().top;
            return rxjs.of({
                virtual: true,
                files,
                search,
                path,
                view,
                permissions,
                currentState: 0,
                $list,
                setHeight,
                FILE_HEIGHT,
                BLOCK_SIZE,
                COLUMN_PER_ROW,
                MARGIN: top($list) - top($list.closest(".scroll-y")),
            });
        }),
        rxjs.switchMap(({
            files, path, view, search, permissions,
            BLOCK_SIZE, COLUMN_PER_ROW, FILE_HEIGHT,
            MARGIN,
            currentState,
            setHeight,
            $list,
            virtual,
        }) => (
            virtual
                ? rxjs.fromEvent($page.closest(".scroll-y"), "scroll", { passive: true })
                : rxjs.EMPTY
        ).pipe(
            rxjs.map((e) => {
                // 0-------------0-----------1-----------2-----------3 ....
                //    [padding]     $block1     $block2     $block3    ....
                const nextState = Math.floor((e.target.scrollTop - MARGIN) / FILE_HEIGHT);
                return Math.max(nextState, 0);
            }),
            rxjs.distinctUntilChanged(),
            rxjs.debounce(() => new rxjs.Observable((observer) => {
                const id = requestAnimationFrame(() => observer.next());
                return () => cancelAnimationFrame(id);
            })),
            rxjs.tap((nextState) => {
                // STEP1: calculate the virtual scroll paramameters
                let diff = nextState - currentState;
                const diffSgn = Math.sign(diff);
                if (Math.abs(diff) > BLOCK_SIZE) { // diff is bound by BLOCK_SIZE
                    // we can't be moving more than what is on the screen
                    diff = diffSgn * BLOCK_SIZE;
                }
                let fileStart = nextState * COLUMN_PER_ROW;
                if (diffSgn > 0) { // => scroll down
                    fileStart += BLOCK_SIZE * COLUMN_PER_ROW;
                    fileStart -= Math.min(diff, BLOCK_SIZE) * COLUMN_PER_ROW;
                }
                let fileEnd = fileStart + diffSgn * diff * COLUMN_PER_ROW;
                if (fileStart >= files.length) { // occur when BLOCK_SIZE is larger than its absolute minimum
                    return;
                }
                else if (fileEnd > files.length) {
                    // occur when files.length isn't a multiple of COLUMN_PER_ROW and
                    // we've scrolled to the bottom of the list already
                    nextState = Math.ceil(files.length / COLUMN_PER_ROW) - BLOCK_SIZE;
                    fileEnd = files.length - 1;
                    for (let i=0; i<COLUMN_PER_ROW; i++) {
                        // add some padding to fileEnd to balance the list to the
                        // nearest COLUMN_PER_ROW
                        fileEnd += 1;
                        if (fileEnd % COLUMN_PER_ROW === 0) {
                            break;
                        }
                    }
                }

                // STEP2: create the new elements
                const $fs = document.createDocumentFragment();
                let n = 0;
                for (let i = fileStart; i < fileEnd; i++) {
                    const file = files[i];
                    if (file === undefined) $fs.appendChild(createThing({
                        type: "hidden",
                    }));
                    else $fs.appendChild(createThing({
                        ...file,
                        ...createLink(file, path),
                        search,
                        view,
                        permissions,
                        n: i,
                    }));
                    n += 1;
                }

                // STEP3: update the DOM
                if (diffSgn > 0) { // scroll down
                    $list.appendChild($fs);
                    for (let i = 0; i < n; i++) $list.firstChild.remove();
                } else { // scroll up
                    $list.insertBefore($fs, $list.firstChild);
                    for (let i = 0; i < n; i++) $list.lastChild.remove();
                }
                setHeight(nextState * FILE_HEIGHT);
                currentState = nextState;
            }),
        )),
        rxjs.catchError(ctrlError()),
    ));

    // feature: keyboard selection
    effect(rxjs.fromEvent(window, "keydown").pipe(
        rxjs.filter((e) => e.keyCode === 27),
        rxjs.tap(() => clearSelection()),
    ));
    effect(rxjs.fromEvent(window, "keydown").pipe(
        rxjs.filter((e) => e.key === "a" &&
                    (e.ctrlKey || e.metaKey) &&
                    (files$.value || []).length > 0 &&
                    assert.type(document.activeElement, HTMLElement).tagName !== "INPUT"),
        preventDefault(),
        rxjs.tap(() => {
            clearSelection();
            if (!Array.isArray(files$.value) || files$.value.length === 0) return;
            const path = currentPath();
            const el0 = files$.value[0];
            const elm1 = files$.value.slice(-1)[0];
            addSelection({
                n: 0,
                path: path + el0.name + (el0.type === "directory" ? "/" : ""),
                shift: false,
                files: [],
            });
            if (elm1) addSelection({
                n: (files$.value || []).length - 1,
                path: path + elm1.name + (elm1.type === "directory" ? "/" : ""),
                shift: true,
                files: (files$.value || []),
            });
        }),
    ));
    effect(getSelection$().pipe(rxjs.tap(() => {
        for (const $thing of $page.querySelectorAll(".component_thing")) {
            let checked = isSelected(parseInt(assert.truthy($thing.getAttribute("data-n"))));
            if ($thing.getAttribute("data-selectable") === "false") checked = false;
            $thing.classList.add(checked ? "selected" : "not-selected");
            $thing.classList.remove(checked ? "not-selected" : "selected");
            qs(assert.type($thing, HTMLElement), `input[type="checkbox"]`).checked = checked;
        };
    })));

    // feature: mouse drag selection
    const $dragContainer = assert.type($page.closest(".component_page_filespage"), HTMLElement);
    const $dragselect = qs($page, `[data-target="dragselect"]`);
    const dragmove = (x, y, w, h) => {
        $dragselect.style.left = `${x}px`;
        $dragselect.style.top = `${y}px`;
        $dragselect.style.width = `${w}px`;
        $dragselect.style.height = `${h}px`;
        if ((w+1) * (h+1) < 50) {
            $dragselect.style.display = "none";
            return false;
        }
        $dragselect.style.display = "block";
        return true;
    };
    if (isMobile === false) effect(rxjs.fromEvent($dragContainer, "mousedown").pipe(
        rxjs.filter((e) => !e.target.closest(`[draggable="true"]`)),
        rxjs.map((e) => ({
            start: [e.clientX, e.clientY],
            state: [...$page.querySelectorAll(".component_thing")].map(($file) => {
                const bounds = $file.getBoundingClientRect();
                const $checkbox = qs(assert.type($file, HTMLElement), ".component_checkbox");
                return {
                    $checkbox,
                    checked: () => $checkbox.firstElementChild.checked,
                    bounds: {
                        x: bounds.x,
                        y: bounds.y,
                        w: bounds.width,
                        h: bounds.height,
                    },
                };
            }),
        })),
        rxjs.mergeMap(({ start, state }) => rxjs.fromEvent(document, "mousemove").pipe(
            rxjs.takeUntil(rxjs.merge(
                rxjs.fromEvent(window, "mouseup"),
                rxjs.fromEvent(window, "keydown").pipe(rxjs.filter(({ key }) => key === "Escape")),
            )),
            rxjs.finalize(() => dragmove(0, 0, 0, 0)),
            rxjs.map((e) => ({ start, end: [e.clientX, e.clientY], state })),
        )),
        rxjs.map(({ start, end, state }) => ({
            state,
            obj: {
                x: Math.min(start[0], end[0]),
                y: Math.min(start[1], end[1]),
                w: Math.abs(start[0] - end[0]),
                h: Math.abs(start[1] - end[1]),
            },
        })),
        rxjs.filter(({ obj }) => dragmove(obj.x, obj.y, obj.w, obj.h)),
        rxjs.tap(({ obj, state }) => {
            for (let i=0; i<state.length; i++) {
                const { bounds, $checkbox, checked } = state[i];
                const collision = !(
                    obj.x + obj.w < bounds.x ||
                        obj.x > bounds.x + bounds.w ||
                        obj.y + obj.h < bounds.y ||
                        obj.y > bounds.y + bounds.h
                );
                if (collision && !checked()) {
                    $checkbox.click();
                } else if (!collision && checked()) {
                    $checkbox.click();
                }
            }
        }),
    ));

    // feature: remove long touch popup on mobile
    const disableLongTouch = (e) => {
        if (isMobile === false) return;
        e.preventDefault();
    };
    document.addEventListener("contextmenu", disableLongTouch);
    onDestroy(() => document.removeEventListener("contextmenu", disableLongTouch));
}

function renderEmpty(render, base64Icon) {
    const $page = createElement(`
        <div class="empty no-select">
            <p class="empty_image">
                <img class="component_icon" draggable="false" src="data:image/svg+xml;base64,${base64Icon}" alt="empty_folder">
            </p>
            <p class="label">${t("There is nothing here")}</p>
        </div>
    `);
    animate(render($page), { time: 250, keyframes: slideYIn(5) });
}

export function init() {
    return Promise.all([
        loadCSS(import.meta.url, "./ctrl_filesystem.css"),
        loadCSS(import.meta.url, "./thing.css"),
        loadCSS(import.meta.url, "./modal.css"),
    ]);
}

export function createLink(file, currentPath) {
    let path = file.path;
    if (!path) path = currentPath + file.name + (file.type === "directory" ? "/" : "");
    let link = file.type === "directory" ? "files" + path : "view" + path;
    link = encodeURIComponent(link).replaceAll("%2F", "/");
    return {
        path,
        link,
    };
}

function gridSize(size, windowSize) {
    const DESIRED_FILE_WIDTH_ON_LARGE_SCREEN = 210;
    if (windowSize > 1100) return Math.max(
        4,
        Math.floor(size / DESIRED_FILE_WIDTH_ON_LARGE_SCREEN),
    );
    else if (size > 750) return 4;
    else if (size > 520) return 3;
    else if (size > 300) return 2;
    return 1;
}
