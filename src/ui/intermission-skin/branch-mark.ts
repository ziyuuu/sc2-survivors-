// Original UI symbols. The shared steel plate separates the white shape from the painting.
export const branches={
  armed:{name:'武装支援',label:'翼形空投舱',shape:`
    <path d="m6 14 12 4v5l-9-3Zm4 9 8 3v4l-5-2Zm32-9-12 4v5l9-3Zm-4 9-8 3v4l5-2Z"/>
    <path fill-rule="evenodd" d="m24 9 4 5v16l-4 7-4-7V14Zm-1.5 8v7h3v-7Z"/>`},
  doomsday:{name:'末日兵器',label:'双联重炮',shape:`
    <path d="m17 22 11-13 3 2-10 13Zm6 2L35 9l3 2-12 15Z"/>
    <path d="m10 25 5-7 6 1 2 5 6 1 3 5H9Z"/>
    <path fill-rule="evenodd" d="M8 31h27l-4 6H12Zm5 2 1.4 2h14.8l1.4-2Z"/>`},
  bio:{name:'生化协同',label:'双螺旋',shape:`
    <g fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="square">
      <path d="M15 9c0 7 4 11 10 15s9 8 9 15M33 9c0 4-2 7-5 10M20 28c-3 3-5 6-5 11"/>
      <path stroke-width="2.8" d="M15.8 12.2h16.5M18.2 17.1h11.7M18.1 32h12.2M15.8 36.8h17.4"/>
    </g>`},
} as const;
export type Branch=keyof typeof branches;

export function branchMark(branch:Branch){
  return `<svg class="branch-mark" data-branch="${branch}" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <path d="M7 1h40v39l-7 7H1V7Z" fill="#101b22" fill-opacity=".96" stroke="#a3adb0" stroke-width="1.4"/>
    <path d="M8 3h35M3 8v31" fill="none" stroke="#677a82" stroke-width="1"/>
    <g fill="currentColor">${branches[branch].shape}</g>
  </svg>`;
}
