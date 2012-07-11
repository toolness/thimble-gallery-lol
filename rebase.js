// https://github.com/mozilla/webpagemaker/blob/development/webpagemaker/api/models.py

var NUMERALS = "3fldc4mzjyqr7bkug5vh0a68xpon9stew12i";

var rebase = module.exports = function rebase(num) {
  var base = NUMERALS.length;
  var leftDigits = Math.floor(num / base);
  if (leftDigits == 0)
    return NUMERALS.charAt(num % base);
  return rebase(leftDigits) + NUMERALS.charAt(num % base);
};
