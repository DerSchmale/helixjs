import {EffectPass} from "../effect/EffectPass";

function DiffuseProbePass()
{
	EffectPass.call(this);
}

DiffuseProbePass.prototype = Object.create(EffectPass.prototype);