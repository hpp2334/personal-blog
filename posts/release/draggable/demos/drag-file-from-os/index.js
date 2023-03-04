(() => {
  const nodeTarget = document.getElementById("demo-dtsf-drag-dest");
  nodeTarget.addEventListener("dragenter", (ev) => ev.preventDefault());
  nodeTarget.addEventListener("dragover", (ev) => {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "copy";
    nodeTarget.innerText = "Drag...";
  });
  nodeTarget.addEventListener("dragleave", (ev) => {
    ev.preventDefault();
    nodeTarget.innerText = "Drag file to here";
  });
  nodeTarget.addEventListener("drop", (ev) => {
    ev.preventDefault();
    nodeTarget.innerText = Array.from(ev.dataTransfer.files)
      .map((ele) => ele.name)
      .join(",");
  });
})();
