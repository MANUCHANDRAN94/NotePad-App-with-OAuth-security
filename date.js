module.exports = getDate;
function getDate(){
  let today = new Date();
  let options = {weekday: "long", day: "numeric", month: "long"};
  let date = today.toLocaleDateString("en-US", options);
  return date;
}