// src/utils/monetary.js
// Decimal-safe currency calculations avoiding floating-point rounding errors

function toPenceOrPaise(amount) {
  return Math.round(Number(amount || 0) * 100);
}

function fromPenceOrPaise(paise) {
  return Number((paise / 100).toFixed(2));
}

function add(a, b) {
  return fromPenceOrPaise(toPenceOrPaise(a) + toPenceOrPaise(b));
}

function subtract(a, b) {
  return fromPenceOrPaise(toPenceOrPaise(a) - toPenceOrPaise(b));
}

function multiply(amount, quantity) {
  const paise = toPenceOrPaise(amount);
  const qty = parseInt(quantity, 10) || 0;
  return fromPenceOrPaise(paise * qty);
}

function formatINR(amount) {
  const num = Number(amount || 0);
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

module.exports = {
  toPenceOrPaise,
  fromPenceOrPaise,
  add,
  subtract,
  multiply,
  formatINR
};
