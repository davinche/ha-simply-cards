export const cardStyles = {
  "header": `
ha-card {
  height:100%;
  min-height:0;
  min-width:0;
  box-sizing:border-box;
  border-radius:24px;
  border:0;
  background:linear-gradient(135deg,var(--echo-color-ffffff,#FFFFFF),var(--echo-color-fff9ef,#FFF9EF));
  box-shadow:0 3px 15px var(--echo-shadow,rgba(30,40,60,0.045));
  padding:20px 24px;
  overflow:hidden
}
.grid {
  min-height:0;
  min-width:0;
  grid-template-areas:"greeting greeting" "room clock" "date date";
  grid-template-columns:minmax(0,1fr) auto;
  grid-template-rows:30px 1fr 27px
}
[data-field="greeting"] {
  justify-self:start;
  align-self:center;
  font-size:18px;
  color:var(--echo-color-818996,#818996)
}
[data-field="room"] {
  justify-self:start;
  align-self:center;
  font-size:43px;
  font-weight:750;
  color:var(--echo-color-18212e,#18212E)
}
[data-field="clock"] {
  justify-self:end;
  align-self:center;
  font-size:31px;
  font-weight:700;
  color:var(--echo-color-18212e,#18212E)
}
[data-field="date"] {
  justify-self:start;
  font-size:17px;
  color:var(--echo-color-818996,#818996)
}
`,
  "weather": `
ha-card {
  height:100%;
  min-height:0;
  min-width:0;
  box-sizing:border-box;
  border-radius:24px;
  border:0;
  background:linear-gradient(125deg,var(--echo-color-e9f2fe,#E9F2FE),var(--echo-color-bcd1eb,#BCD1EB));
  box-shadow:0 3px 15px var(--echo-shadow,rgba(30,40,60,0.045));
  padding:20px 22px;
  overflow:hidden
}
.grid {
  min-height:0;
  min-width:0;
  grid-template-areas:"i eyebrow" "i condition" "i temperature" "i humidity";
  grid-template-columns:92px minmax(0,1fr);
  grid-template-rows:repeat(4, min-content);
  align-content:center;
  row-gap:2px
}
.img-cell {
  width:76px;
  align-self:center;
  justify-self:center
}
ha-icon {
  width:62px;
  color:var(--echo-color-f3bd35,#F3BD35)
}
[data-field="eyebrow"] {
  justify-self:start;
  font-size:16px;
  color:var(--echo-color-475a73,#475A73)
}
[data-field="condition"] {
  justify-self:start;
  align-self:end;
  font-size:23px;
  font-weight:700;
  color:var(--echo-color-20334c,#20334C)
}
[data-field="temperature"] {
  justify-self:start;
  font-size:25px;
  font-weight:650;
  color:var(--echo-color-20334c,#20334C)
}
[data-field="humidity"] {
  justify-self:start;
  font-size:13px;
  color:var(--echo-color-61748d,#61748D)
}
`,
  "toggle": `
ha-card {
  height:100%;
  min-height:0;
  min-width:0;
  box-sizing:border-box;
  border-radius:24px;
  border:0;
  background:var(--echo-color-ffffff,#FFFFFF);
  box-shadow:0 3px 15px var(--echo-shadow,rgba(30,40,60,0.045));
  padding:18px;
  overflow:hidden
}
.grid {
  min-height:0;
  min-width:0;
  grid-template-areas:"i toggle" "n n" "l l";
  grid-template-columns:1fr auto;
  grid-template-rows:1fr min-content min-content
}
.img-cell {
  justify-self:start;
  align-self:start;
  height:52px;
  width:52px;
  border-radius:16px;
  background:var(--state-background)
}
ha-icon {
  width:28px;
  color:var(--state-color)
}
.name {
  font-size:17px;
  font-weight:650;
  color:var(--echo-color-202732,#202732);
  justify-self:start;
  align-self:end;
  margin-top:7px
}
.label {
  font-size:14px;
  justify-self:start;
  color:var(--echo-color-8a929e,#8A929E);
  margin-top:2px
}
[data-field="toggle"] {
  justify-self:end;
  align-self:center
}
`,
  "fan": `
ha-card {
  height:100%;
  min-height:0;
  min-width:0;
  box-sizing:border-box;
  border-radius:calc(24 * var(--echo-unit, 1px));
  border:0;
  background:var(--echo-color-ffffff,#FFFFFF);
  box-shadow:0 calc(3 * var(--echo-unit, 1px)) calc(15 * var(--echo-unit, 1px)) var(--echo-shadow,rgba(30,40,60,0.045));
  padding:calc(18 * var(--echo-unit, 1px));
  overflow:hidden
}
.grid {
  min-height:0;
  min-width:0;
  grid-template-areas:"power" "title" "status" "speed";
  grid-template-columns:minmax(0,1fr);
  grid-template-rows:minmax(calc(44 * var(--echo-unit, 1px)),1fr) calc(24 * var(--echo-unit, 1px)) calc(20 * var(--echo-unit, 1px)) 62px
}
[data-field="power"] {
  width:100%;
  align-self:start;
  height:calc(44 * var(--echo-unit, 1px))
}
[data-field="title"] {
  justify-self:start;
  align-self:end;
  font-size:calc(19 * var(--echo-unit, 1px));
  line-height:calc(23 * var(--echo-unit, 1px));
  font-weight:650;
  color:var(--echo-color-202732,#202732)
}
[data-field="status"] {
  justify-self:start;
  font-size:calc(14 * var(--echo-unit, 1px));
  line-height:calc(19 * var(--echo-unit, 1px));
  color:var(--echo-color-8a929e,#8A929E)
}
[data-field="speed"] {
  width:100%;
  min-width:0;
  align-self:end
}
`,
  "fan-power": `
ha-card {
  height:calc(44 * var(--echo-unit, 1px));
  padding:0;
  border:0;
  background:transparent;
  box-shadow:none;
  border-radius:calc(15 * var(--echo-unit, 1px));
  box-sizing:border-box
}
.grid {
  grid-template-areas:"i toggle";
  grid-template-columns:1fr auto;
  grid-template-rows:calc(44 * var(--echo-unit, 1px))
}
.img-cell {
  width:calc(44 * var(--echo-unit, 1px));
  height:calc(44 * var(--echo-unit, 1px));
  justify-self:start;
  border-radius:calc(15 * var(--echo-unit, 1px));
  background:var(--state-background)
}
ha-icon {
  width:calc(27 * var(--echo-unit, 1px));
  color:var(--state-color)
}
[data-field="toggle"] {
  justify-self:end;
  align-self:center
}
`,
  "media": `
ha-card {
  height:100%;
  min-height:0;
  min-width:0;
  box-sizing:border-box;
  border-radius:24px;
  border:0;
  background:var(--echo-color-ffffff,#FFFFFF);
  box-shadow:0 3px 15px var(--echo-shadow,rgba(30,40,60,0.045));
  padding:20px 22px;
  overflow:hidden
}
.grid {
  min-height:0;
  min-width:0;
  grid-template-areas:"art info info info info" "art previous play next volume";
  grid-template-columns:100px repeat(4, minmax(0, 1fr));
  grid-template-rows:minmax(0, 1fr) 52px;
  column-gap:12px;
  row-gap:12px
}
[data-field="art"] {
  align-self:center;
  justify-self:start
}
[data-field="info"] {
  align-self:center;
  justify-self:start;
  min-width:0;
  width:100%
}
[data-field="previous"] {
  justify-self:center;
  align-self:center
}
[data-field="play"] {
  justify-self:center;
  align-self:center
}
[data-field="next"] {
  justify-self:center;
  align-self:center
}
[data-field="volume"] {
  justify-self:center;
  align-self:center
}
`,
  "art": `
ha-card {
  width:100px;
  height:118px;
  border-radius:15px;
  border:0;
  padding:0;
  overflow:hidden;
  box-sizing:border-box;
  box-shadow:none;
  background:linear-gradient(160deg,#b9b2e4,#edafbf 60%,#f4c89a)
}
.grid {
  grid-template-areas:"i";
  grid-template-columns:1fr;
  grid-template-rows:1fr
}
.img-cell {
  width:100%;
  height:100%
}
ha-icon {
  width:38px;
  color:#FFFFFF
}
img {
  width:100%;
  height:100%;
  object-fit:cover
}
`,
  "media-action": `
ha-card {
  height:48px;
  width:48px;
  border-radius:50%;
  background:var(--echo-color-f2f4f7,#F2F4F7);
  box-shadow:none;
  border:0;
  padding:10px;
  box-sizing:border-box
}
ha-icon {
  width:25px;
  color:var(--echo-color-293646,#293646)
}
`,
  "climate": `
ha-card {
  height:100%;
  min-height:0;
  min-width:0;
  box-sizing:border-box;
  border-radius:24px;
  border:0;
  background:var(--echo-color-ffffff,#FFFFFF);
  box-shadow:0 3px 15px var(--echo-shadow,rgba(30,40,60,0.045));
  padding:18px;
  overflow:hidden
}
.grid {
  min-height:0;
  min-width:0;
  grid-template-areas:"i n current" "i l current" "i hint current";
  grid-template-columns:80px minmax(0,1fr) auto;
  grid-template-rows:repeat(3, min-content);
  align-content:center;
  row-gap:6px
}
.img-cell {
  width:66px;
  height:66px;
  border-radius:50%;
  background:var(--state-background)
}
ha-icon {
  width:35px;
  color:var(--state-color)
}
.name {
  font-size:16px;
  font-weight:650;
  color:var(--echo-color-253041,#253041);
  justify-self:start;
  align-self:end
}
.label {
  font-size:13px;
  color:var(--echo-color-89919d,#89919D);
  justify-self:start;
  margin-top:4px
}
[data-field="current"] {
  font-size:31px;
  font-weight:700;
  color:var(--echo-color-18212e,#18212E)
}
[data-field="hint"] {
  justify-self:start;
  align-self:end;
  font-size:11px;
  color:var(--echo-color-a0a6b0,#A0A6B0)
}
`,
  "security": `
ha-card {
  height:100%;
  min-height:0;
  min-width:0;
  box-sizing:border-box;
  border-radius:24px;
  border:0;
  background:var(--echo-color-ffffff,#FFFFFF);
  box-shadow:0 3px 15px var(--echo-shadow,rgba(30,40,60,0.045));
  padding:17px;
  overflow:hidden
}
.grid {
  min-height:0;
  min-width:0;
  grid-template-areas:"heading heading heading" "front back garage";
  grid-template-columns:repeat(3, minmax(0,1fr));
  grid-template-rows:38px minmax(0,1fr);
  column-gap:10px;
  row-gap:8px
}
[data-field="heading"] {
  justify-self:start;
  align-self:center
}
[data-field="front"] {
  width:100%;
  height:100%
}
[data-field="back"] {
  width:100%;
  height:100%
}
[data-field="garage"] {
  width:100%;
  height:100%
}
`,
  "security-tile": `
ha-card {
  height:100%;
  box-sizing:border-box;
  background:var(--echo-color-fafbfd,#FAFBFD);
  border:0;
  --ha-card-border-width:0px;
  border-radius:19px;
  padding:12px 5px;
  box-shadow:none
}
.grid {
  grid-template-areas:"i" "n" "l";
  grid-template-columns:1fr;
  grid-template-rows:min-content min-content min-content;
  align-content:center
}
.img-cell {
  justify-self:center;
  height:50px;
  width:50px;
  border-radius:50%;
  background:var(--state-background)
}
ha-icon {
  width:25px;
  color:var(--state-color)
}
.name {
  font-size:13px;
  font-weight:650;
  color:var(--echo-color-263140,#263140);
  justify-self:center;
  margin-top:6px
}
.label {
  font-size:12px;
  color:var(--echo-color-89919d,#89919D);
  justify-self:center;
  margin-top:3px
}
`,
};
