export async function loadDropdown(table, elementId){
  const { data, error } = await db.from(table).select('value');

  if(error){
    console.error(error);
    return;
  }

  const el = document.getElementById(elementId);
  el.innerHTML = '';

  data.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.value;
    opt.text = item.value;
    el.appendChild(opt);
  });
}
