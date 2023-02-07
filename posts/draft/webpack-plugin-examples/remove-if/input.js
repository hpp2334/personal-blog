function main() {
  if (IN_DEV) {
    console.log('in "in dev"');
  }

  if (NOT_IN_DEV) {
    console.log('in "not in dev"');
  } else {
    console.log('in else "not in dev"');
  }

  console.log('out of IN_DEV');
}