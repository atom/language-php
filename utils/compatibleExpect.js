// compatibility with atom test runner
const {
  util: { flag, addMethod },
  Assertion,
} = require("chai");

addMethod(Assertion.prototype, "toBeTruthy", function () {
  flag(this, "lockSsfi", true);
  this.ok;
  flag(this, "lockSsfi", false);
});

addMethod(Assertion.prototype, "toBe", function (val) {
  flag(this, "lockSsfi", true);
  this.equal(val);
  flag(this, "lockSsfi", false);
});

addMethod(Assertion.prototype, "toEqual", function (val) {
  flag(this, "lockSsfi", true);
  this.deep.equal(val);
  flag(this, "lockSsfi", false);
});

addMethod(Assertion.prototype, "toContain", function (val) {
  flag(this, "lockSsfi", true);
  this.include(val);
  flag(this, "lockSsfi", false);
});

addMethod(Assertion.prototype, "toContainAll", function (val) {
  flag(this, "lockSsfi", true);
  this.include.members(val);
  flag(this, "lockSsfi", false);
});

addMethod(Assertion.prototype, "toBeNull", function () {
  flag(this, "lockSsfi", true);
  this.null;
  flag(this, "lockSsfi", false);
});
