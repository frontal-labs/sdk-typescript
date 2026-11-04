// Compiled under moduleResolution NodeNext against the built @frontal-labs/sdk.
// If the emitted declarations lose their `.js` specifiers, `frontal` silently
// becomes `any` and the wrong-type assignments below stop failing.
import { Frontal } from "@frontal-labs/sdk";

const frontal = new Frontal({ apiKey: "frt_test_key_123456" });

// The typed client is a class instance, not `any`: this assignment must fail.
// @ts-expect-error a Frontal instance is not assignable to an object literal type
const probe: { nope: true } = frontal;

// The ontology namespace is a real type, not `any`: assigning it to a string must fail.
// @ts-expect-error the ontology namespace is an object, not a string
const shape: string = frontal.ontology;

export { probe, shape };
