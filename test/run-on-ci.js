import { Test } from '@nodutilus/test'
import { AllTests } from './all-tests.js'

Test.runOnCI(new AllTests())
