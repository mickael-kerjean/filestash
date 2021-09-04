// Copyright 2015 Muir Manders.  All rights reserved.
// Use of this source code is governed by a MIT-style
// license that can be found in the LICENSE file.

package goftp

// Taken from https://www.ietf.org/rfc/rfc959.txt

const (
	replyGroupPreliminaryReply   = 1
	replyGroupPositiveCompletion = 2

	// positive preliminary replies
	replyRestartMarker             = 110 // Restart marker reply
	replyReadyInNMinutes           = 120 // Service ready in nnn minutes
	replyDataConnectionAlreadyOpen = 125 // (transfer starting)
	replyFileStatusOkay            = 150 // (about to open data connection)

	// positive completion replies
	replyCommandOkay                 = 200
	replyCommandOkayNotImplemented   = 202
	replySystemStatus                = 211 // or system help reply
	replyDirectoryStatus             = 212
	replyFileStatus                  = 213
	replyHelpMessage                 = 214
	replySystemType                  = 215
	replyServiceReady                = 220
	replyClosingControlConnection    = 221
	replyDataConnectionOpen          = 225 // (no transfer in progress)
	replyClosingDataConnection       = 226 // requested file action successful
	replyEnteringPassiveMode         = 227
	replyEnteringExtendedPassiveMode = 229
	replyUserLoggedIn                = 230
	replyAuthOkayNoDataNeeded        = 234
	replyFileActionOkay              = 250 // (completed)
	replyDirCreated                  = 257

	// positive intermediate replies
	replyNeedPassword      = 331
	replyNeedAccount       = 332
	replyFileActionPending = 350 // pending further information

	// transient negative completion replies
	replyServiceNotAvailable    = 421 // (service shutting down)
	replyCantOpenDataConnection = 425
	replyConnectionClosed       = 426 // (transfer aborted)
	replyTransientFileError     = 450 // (file unavailable)
	replyLocalError             = 451 // action aborted
	replyOutOfSpace             = 452 // action not taken

	// permanenet negative completion replies
	replyCommandSyntaxError                = 500
	replyParameterSyntaxError              = 501
	replyCommandNotImplemented             = 502
	replyBadCommandSequence                = 503
	replyCommandNotImplementedForParameter = 504
	replyNotLoggedIn                       = 530
	replyNeedAccountToStore                = 532
	replyFileError                         = 550 // file not found, no access
	replyPageTypeUnknown                   = 551
	replyExceededStorageAllocation         = 552 // for current directory/dataset
	replyBadFileName                       = 553
)

func positiveCompletionReply(code int) bool {
	return code/100 == 2
}

func positivePreliminaryReply(code int) bool {
	return code/100 == 1
}

func transientNegativeCompletionReply(code int) bool {
	return code/100 == 4
}
