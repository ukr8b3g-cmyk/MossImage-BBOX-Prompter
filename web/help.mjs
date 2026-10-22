// Help follows ComfyUI's language, independently of saved node UI preferences.
let localeReader = () => globalThis.document?.documentElement.lang || "en";
export function setHelpLocaleReader(reader) { localeReader = reader; }

export const HELP = {
  auto_position_hint: ["Add a position phrase such as upper-left from each box to caption/hybrid prose. Does not move boxes. No effect on layout_json or auto with boxes.", "各BBOXの位置から「左上」などの英文をcaption／hybridの文章に補います。枠を自動配置・移動する機能ではありません。layout_jsonとBBOXがあるautoには影響しません。"],
  output_mode: ["auto: layout JSON with boxes, prose without boxes. layout_json: JSON only (unboxed content is omitted). caption: prose only. hybrid: prose + JSON. Placement is guidance, not guaranteed.", "auto：BBOXがあれば配置JSON、なければ文章。layout_json：JSONのみ（枠のない内容は省略）。caption：文章のみ。hybrid：文章＋JSON。配置は生成への指示であり、結果を保証しません。"],
  text_mode: ["literal: Text cards contain exact visible wording, preserving spaces, newlines, quotes and |. Describe appearance in text_style. legacy: visible words | appearance.", "literal：Text欄を画像内に描く文字として扱い、空白・改行・引用符・|も保持します。見た目はtext_styleで指定。legacy：「描く文字 | 見た目の説明」の形式です。"],
  text_style: ["Shared appearance of all Text items in literal mode (font, color, outline). Enter wording in the Text card, not here. Ignored in legacy mode.", "literalモードの全Textに共通する書体・色・縁取りなどを指定します。描く文字そのものはText欄へ入力します。legacyモードでは使いません。"],
  framing_data: ["Connect the MOSS BBOX Canvas framing_data output. Carries canvas dimensions, box positions and camera settings. Branch the same output to Export and Preview.", "MOSS BBOX Canvasのframing_data出力を接続します。サイズ・枠の座標・カメラ設定を渡します。同じ出力をExportとPreviewへ分岐できます。"],
  prompt_ui_data: ["Connect MOSS BBOX Prompter prompt_ui_data to Export. Color cards supply descriptions and Character/Object/Text types for matching Canvas boxes.", "MOSS BBOX Prompterのprompt_ui_dataをExportへ接続します。各色の説明とCharacter／Object／Textを、同じ色のBBOXに対応させます。"],
  images: ["Connect a decoded IMAGE (VAE Decode or your generation subgraph's IMAGE), or Load Image → IMAGE. The result appears inside this Preview node after execution. Keep your save connection too.", "VAE Decodeや生成サブグラフのIMAGE出力、またはLoad ImageのIMAGEを接続します。実行後、このPreviewノード内に画像が出ます。保存ノードへの接続は残せます。"],
  preview_output: ["Original IMAGE passes through unchanged, without drawn boxes. Can connect to your image save node.", "入力IMAGEを枠を描き込まず、そのまま出力します。画像保存ノードにも接続できます。"],
  prompt_output: ["Connect to the positive text encoder or the generation subgraph's text/prompt input. This is the compiled MOSS prompt.", "生成サブグラフのtext／prompt入力、またはポジティブ側のテキストエンコーダーへ接続します。MOSS用に組み立てたプロンプトです。"],
  width_output: ["Connect width to the latent or generation subgraph width. Match generation size to the Canvas.", "潜在画像または生成サブグラフのwidthへ接続し、生成サイズをCanvasと揃えます。"],
  height_output: ["Connect height to the latent or generation subgraph height. Match generation size to the Canvas.", "潜在画像または生成サブグラフのheightへ接続し、生成サイズをCanvasと揃えます。"],
  moss_json: ["MOSS layout JSON for inspection or external use; normally leave disconnected. The prompt output already contains the chosen output format.", "確認・外部利用用のMOSS配置JSONです。通常は未接続で構いません。prompt出力には選んだ形式がすでに含まれます。"],
  show: ["Show/hide Canvas boxes only. Hidden boxes are still included in generation. To hide preview borders, use Show Boxes in Preview.", "Canvas上の枠の表示だけを切り替えます。非表示でも生成にはBBOXを渡します。生成画像上の枠はPreview側のShow Boxesで切り替えます。"],
  draw: ["Toggle new-box drawing ON/OFF. Highlighted: drag to create a box, including over existing boxes. Click again to return to selecting, moving, resizing or Alt-drag duplication. A completed new box returns to selection mode. Choose a color to match its Prompter card.", "新規作成モードのON／OFFを切り替えます。点灯中は既存の枠の上でもドラッグで新しいBBOXを作成。もう一度押すと選択・移動・リサイズ・Alt複製に戻ります。新規作成完了後も選択モードに戻ります。色は対応するPrompterの欄と揃えます。"],
  reset: ["Reset boxes, canvas size, guides and camera settings; keep prompts. Explicitly clears a corrupt layout too.", "BBOX・サイズ・ガイド・カメラ設定をリセットします。プロンプトは残します。破損レイアウトの原文も、この明示的な操作で消去します。"],
  undo: ["Undo a Canvas edit (Ctrl/Cmd+Z). Up to 60 steps, only in this session; history is not saved in workflows.", "Canvasの編集を戻します（Ctrl／Cmd＋Z）。履歴は編集中の最大60件で、Workflowには保存しません。"],
  redo: ["Redo a Canvas edit (Ctrl/Cmd+Shift+Z or Ctrl+Y). A new edit after Undo discards Redo.", "Canvasの編集をやり直します（Ctrl／Cmd＋Shift＋Z、またはCtrl＋Y）。Undo後に別の編集をするとRedo履歴は消えます。"],
  color: ["Choose the color for new boxes. Boxes of the same color share one Prompter description.", "これから描くBBOXの色を選びます。同じ色の枠は同じPrompter欄の説明を共有します。"],
  grid_mode: ["Display center or thirds guides, or hide them. Guides alone do not change the prompt or snap boxes.", "中央線・三分割線の表示、または非表示を選びます。ガイド表示だけではプロンプトや枠の位置を変更しません。"],
  snap: ["Snap dragged edges/centers and resized edges to center/thirds within 6 screen pixels. Shift+corner resize prioritizes aspect ratio over snapping. Numeric/arrow edits stay exact. Starts OFF on workflow load.", "ドラッグ時の枠の端・中心と、サイズ変更中の端を、画面上6px以内の中央線・三分割線へ吸着します。Shift＋角ドラッグ中は比率固定を優先し、吸着しません。数値・矢印キーの指定は優先します。読込時はOFFです。"],
  ui_language: ["Choose this node's label language. Hover help follows ComfyUI's Language setting independently.", "このノードの表示ラベルの言語を選びます。マウスオーバー説明は、この選択と独立してComfyUI本体の言語設定に従います。"],
  geometry: ["Geometry of the last selected box in canvas pixels: X/Y are its top-left, W/H its size. Editing these fields selects and edits only that box. No snapping. Canvas arrow keys move the whole selection 1 px, or 10 px with Shift. Undo supported.", "最後に選択した枠の座標・サイズをCanvasのピクセル単位で表示します。X／Yは左上、W／Hは幅／高さ。数値を変更すると、その1枠だけを選択して編集します（吸着なし）。Canvas上の矢印キーは選択した枠すべてを1px、Shift併用で10px移動。Undo対応です。"],
  canvas: ["Draw Box OFF: Ctrl/Cmd+click toggles boxes in the selection; selected boxes have white borders. Drag inside a selected box to move the selection together; Alt+drag duplicates it (same colors/prompts). Bounds and Snap apply to the whole selection. Alt+click cycles overlaps and selects one box. Corners resize only that box; hold Shift for its starting aspect ratio, overriding snap. Shift at top-right resizes instead of deleting. Numeric fields edit one box. Delete removes the selection; Escape clears selection or cancels a drag. Arrows move all selected boxes 1 px, Shift: 10 px. Ctrl/Cmd+Z: Undo.", "Draw BoxがOFFのとき、Ctrl／Cmd＋クリックで複数選択を追加・解除。選択枠は白線になります。選択枠の内側をドラッグで一括移動、Alt＋ドラッグで一括複製（各色・説明を維持）。Canvas端と吸着は全体に適用します。Alt＋クリックは重なった枠から1枠を選択。角や数値欄の編集はその1枠だけが対象です。Shift＋角ドラッグで開始時の縦横比を固定し、吸着より優先。右上角もShift併用なら削除せずリサイズ。Deleteで選択枠すべてを削除、Escapeで選択解除／ドラッグ取消。矢印キーで全選択枠を1px、Shift併用で10px移動。Ctrl／Cmd＋ZでUndo。"],
  preset: ["Choose a canvas resolution preset. Export width/height must also be connected to generation dimensions.", "Canvasの解像度プリセットを選びます。Exportのwidth／heightも生成側のサイズ入力へ接続してください。"],
  width: ["Canvas width in pixels (multiples of 16). Connected width input overrides the local size.", "Canvasの幅をピクセル単位・16の倍数で指定します。外部のwidth入力が接続されている場合は外部値を優先します。"],
  height: ["Canvas height in pixels (multiples of 16). Connected height input overrides the local size.", "Canvasの高さをピクセル単位・16の倍数で指定します。外部のheight入力が接続されている場合は外部値を優先します。"],
  save_size: ["Save the current custom resolution as a local size preset.", "現在のカスタム解像度をローカルのサイズプリセットに保存します。"],
  delete_size: ["Delete the selected custom resolution preset.", "選択したカスタム解像度プリセットを削除します。"],
  canvas_preset: ["Choose a saved Canvas preset, then Load to restore size, boxes, guides, node language and camera values.", "保存済みCanvasプリセットを選び、Loadでサイズ・BBOX・ガイド・ノードの言語・カメラ値を復元します。"],
  save_canvas: ["Save size, boxes, guides, node language and camera values as a Canvas preset. Prompter text is not included.", "サイズ・BBOX・ガイド・ノードの言語・カメラ値をCanvasプリセットに保存します。Prompterの文章は含みません。"],
  load_canvas: ["Replace the current Canvas settings with the selected preset. Prompter text is unchanged.", "現在のCanvas設定を選択したプリセットに置き換えます。Prompterの文章は変更しません。"],
  delete_canvas: ["Delete the selected Canvas preset.", "選択したCanvasプリセットを削除します。"],
  camera: ["Camera values are descriptive prompt hints, not real camera controls. Blank lets the model decide. Stored with the Canvas.", "カメラ値はプロンプトの描写指示で、実カメラの制御ではありません。空欄ならモデルに任せます。Canvasと一緒に保存します。"],
  iso: ["ISO sensitivity hint. Select a value or enter Custom; blank omits it from the prompt.", "ISO感度の描写指示。選択またはCustom入力ができます。空欄ならプロンプトに追加しません。"],
  shutter: ["Shutter-speed hint (e.g. 1/125). Select or enter Custom; blank omits it.", "シャッター速度の描写指示（例：1/125）。選択またはCustom入力。空欄なら追加しません。"],
  aperture: ["Aperture hint (e.g. f/2.8) for depth-of-field description. Select or enter Custom; blank omits it.", "絞りの描写指示（例：f/2.8）。被写界深度などの表現に使います。選択またはCustom入力。空欄なら追加しません。"],
  focal_length: ["Focal-length hint (e.g. 50mm). Select or enter Custom; blank omits it.", "焦点距離の描写指示（例：50mm）。選択またはCustom入力。空欄なら追加しません。"],
  scene: ["Describe the whole scene, background, lighting and style. This applies to the whole image, not one box.", "画像全体のシーン・背景・照明・画風を入力します。特定のBBOXだけでなく画像全体への指示です。"],
  background: ["Additional background/environment description, combined with the scene on export.", "背景・環境の補足説明です。出力時にシーンの説明と組み合わせます。"],
  scene_preset: ["Choose a local scene/background preset. Click Load to apply it.", "ローカルのシーン／背景プリセットを選び、Loadで適用します。"],
  save_scene: ["Save the current scene/background as a local preset.", "現在のシーン／背景をローカルプリセットに保存します。"],
  load_scene: ["Replace scene/background with the selected preset.", "シーン／背景を選択したプリセットの内容に置き換えます。"],
  delete_scene: ["Delete the selected scene/background preset.", "選択したシーン／背景プリセットを削除します。"],
  slot_prompt: ["Describe what appears in matching-color boxes. Character: person; Object: subject/prop; Text with literal mode: exact wording. Unboxed Text is omitted from layout output.", "同じ色の枠に描く内容を入力します。Characterは人物、Objectは物体・小物、Text＋literalは描く文字そのものです。BBOXがないTextは配置JSONから省略されます。"],
  type: ["Character: person/character. Object: object or prop. Text: visible lettering. The chosen type is preserved in the MOSS layout.", "Character：人物・キャラクター。Object：物体・小物。Text：画像内の文字。選んだタイプをMOSSの配置データに保持します。"],
  framing: ["How much of the subject to show, such as full body or close-up. Auto adds no framing hint. Does not resize the BBOX; not applied to Text.", "全身・上半身・アップなど、被写体を写す範囲の指示です。Autoは追加指示なし。BBOX自体のサイズは変わりません。Textには適用しません。"],
  angle: ["Subject viewing angle/perspective. Auto adds no angle hint. Does not move the BBOX; not applied to Text.", "被写体の視点・角度の指示です。Autoは追加指示なし。BBOX自体は動きません。Textには適用しません。"],
  fold: ["Open/close this color card. Closing does not remove its prompt from generation.", "この色の欄を開閉します。閉じてもプロンプトは生成に使われます。"],
  preview_show: ["Show/hide borders on this preview only. Takes effect immediately without regeneration; also applies to the next preview. Saved image pixels stay unchanged.", "このプレビュー上の枠だけを表示／非表示にします。再生成不要で即時反映し、次のプレビューにも引き継ぎます。保存画像の画素は変更しません。"],
  preview_opacity: ["Border opacity only: 0% invisible, 100% opaque. Changes instantly without regeneration; saved with this node.", "枠だけの不透明度です。0％で透明、100％で不透明。再生成不要で即時反映し、このノードの設定として保存します。"],
  previous: ["Show the previous image in this execution's batch.", "今回の実行で得たバッチの前の画像を表示します。"],
  next: ["Show the next image in this execution's batch.", "今回の実行で得たバッチの次の画像を表示します。"],
  preview_info: ["Boxes show requested positions from this execution, not detected subjects. Scaled to the full image; crops are not corrected. No boxes are burned into the image.", "枠は今回指定した配置で、被写体の検出結果ではありません。画像全体に合わせて拡大縮小し、切り抜きは補正しません。画像には枠を書き込みません。"],
  preview_empty: ["Add MOSS BBOX Preview (image/MOSS). Connect generation IMAGE → images and Canvas framing_data → framing_data, then Run. The image appears here. For an existing image, use Load Image → IMAGE instead; no regeneration needed.", "MOSS BBOX Preview（image/MOSS）を追加し、生成側のIMAGE→images、Canvasのframing_data→framing_dataを接続して実行すると、ここに画像が出ます。既存画像ならLoad ImageのIMAGEを接続し、画像の再生成なしで確認できます。"],
  layout_data: ["Saved Canvas layout. Edit with Canvas controls. Invalid data is preserved until an explicit Reset or a valid workflow load.", "Canvasの保存用配置データです。通常はCanvasの操作で編集します。不正なデータは明示的なResetまたは正常なWorkflow読込まで保持します。"],
  camera_data: ["Saved camera description values. Use the Camera Settings controls.", "カメラ描写の保存用データです。通常はCamera Settingsで操作します。"],
  camera_set_data: ["Saved camera preset data.", "保存されたカメラプリセットのデータです。"],
  canvas_preset_data: ["Saved Canvas presets, including dimensions and boxes.", "サイズ・枠などを含むCanvasプリセットの保存用データです。"],
  prompt_state: ["Saved Prompter UI state. Use the color cards to edit text and types.", "PrompterのUI保存状態です。通常は各色の欄で文章・タイプを編集します。"],
  moss_state: ["Legacy node's saved layout and prompts. Edit using its Canvas/Prompter controls.", "旧ノードの配置・プロンプト保存データです。Canvas／Prompterの操作で編集します。"],
};

export function helpText(key, locale = localeReader()) {
  return HELP[key]?.[/^ja(?:-|$)/i.test(locale || "") ? 1 : 0] || "";
}

export function bindHelp(element, key) {
  element.dataset.mossHelp = key;
  const update = () => {
    if (element.getAttribute("aria-invalid") !== "true") element.title = helpText(key);
  };
  update();
  element.addEventListener("pointerenter", update);
  element.addEventListener("focusin", update);
  return element;
}

export function widgetHelpKey(name) {
  if (/^(red|blue|yellow|green|magenta)_/.test(name)) {
    const suffix = name.slice(name.indexOf("_") + 1);
    return suffix === "prompt" ? "slot_prompt" : suffix;
  }
  return name === "prompt_ui_data" ? "prompt_state" : name;
}
