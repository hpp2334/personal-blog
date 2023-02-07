export default () => {
  const box = document.querySelector('.box-drag-block-anywhere');
  if (!box) {
    return;
  }
  box.addEventListener('mousedown', ev => {
    let [oldX, oldY] = [ev.clientX, ev.clientY];
    if (!box.style.left || !box.style.top) {
      box.style.left = box.style.top = 0;
    }
    function handleMouseMove (ev) {
      const [newX, newY] = [ev.clientX, ev.clientY];
      box.style.left = `${parseInt(box.style.left) + newX - oldX}px`;
      box.style.top = `${parseInt(box.style.top) + newY - oldY}px`;
      [oldX, oldY] = [newX, newY];
    }
    function handleMouseUp (ev) {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  });
};